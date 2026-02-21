import { Injectable, Logger } from '@nestjs/common';
import { EnvConfigService } from '@/common/service/env/env-config.service';
import { PaymentApprovedQueueProvider } from '@/providers/rabbitmq/providers/payment-approved-queue.provider';
import { SagaEventsProvider } from '@/providers/rabbitmq/saga/saga-events.provider';
import { SagaWorkOrderStep } from '@/providers/rabbitmq/saga/saga.types';

interface MercadoPagoWebhookBody {
  type?: string;
  action?: string;
  data?: { id: string };
}

interface MercadoPagoPaymentResponse {
  id: number;
  status?: string;
  external_reference?: string | null;
}

@Injectable()
export class HandlePaymentWebhookUseCase {
  private readonly logger = new Logger(HandlePaymentWebhookUseCase.name);

  constructor(
    private readonly envConfig: EnvConfigService,
    private readonly paymentApprovedQueue: PaymentApprovedQueueProvider,
    private readonly sagaEvents: SagaEventsProvider,
  ) {}

  private isInProgressStatus(status: string): boolean {
    return ['pending', 'in_process', 'in_mediation', 'authorized'].includes(
      status,
    );
  }

  /** Aceita type=payment (oficial) ou action que comece com "payment." (ex: payment.created) */
  private isPaymentWebhook(payload: MercadoPagoWebhookBody): boolean {
    if (payload.type === 'payment') return true;
    const action = payload.action ?? '';
    return typeof action === 'string' && action.startsWith('payment.');
  }

  async execute(body: unknown): Promise<void> {
    const payload = body as MercadoPagoWebhookBody;
    if (!payload?.type && !payload?.action) {
      this.logger.debug('Webhook ignorado: sem type/action');
      return;
    }

    if (!this.isPaymentWebhook(payload)) {
      this.logger.debug(
        `Webhook ignorado: type=${payload.type}, action=${payload.action}`,
      );
      return;
    }

    const paymentId = payload.data?.id;
    if (!paymentId) {
      this.logger.warn('Webhook payment sem data.id');
      return;
    }

    const accessToken = this.envConfig.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      this.logger.error('MERCADOPAGO_ACCESS_TOKEN não configurado');
      return;
    }

    try {
      const payment = await this.fetchPaymentFromMercadoPago(
        accessToken,
        paymentId,
      );
      if (!payment) return;

      const status = (payment.status ?? '').toLowerCase();
      const workOrderId = this.getWorkOrderId(payment);
      if (status !== 'approved') {
        if (this.isInProgressStatus(status)) {
          this.logger.debug(
            `Pagamento ${paymentId} status=${status}, aguardando evolução`,
          );
          return;
        }

        await this.publishCompensationForPaymentProblem({
          paymentId,
          status,
          workOrderId,
          payload,
          payment,
        });
        return;
      }

      if (workOrderId == null) {
        this.logger.warn(`Pagamento ${paymentId} sem external_reference válido`);
        return;
      }

      await this.paymentApprovedQueue.publish({
        workOrderId,
        paymentId: String(payment.id),
        status: payment.status ?? 'approved',
        fullPayload: {
          webhook: payload,
          payment,
        },
        debug: {
          webhook: payload,
          payment,
        },
      });
      this.logger.log(
        `Webhook processado: payment ${paymentId} aprovado, workOrderId=${workOrderId} notificado`,
      );
    } catch (error: unknown) {
      this.logger.error(
        'Erro ao processar webhook de pagamento',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  private async fetchPaymentFromMercadoPago(
    accessToken: string,
    paymentId: string,
  ): Promise<MercadoPagoPaymentResponse | null> {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!response.ok) {
      this.logger.warn(
        `Falha ao buscar pagamento ${paymentId}: ${response.status}`,
      );
      return null;
    }
    const data = (await response.json()) as MercadoPagoPaymentResponse;
    return data;
  }

  private getWorkOrderId(payment: MercadoPagoPaymentResponse): number | null {
    const workOrderIdStr = payment.external_reference;
    if (!workOrderIdStr) return null;

    const workOrderId = parseInt(workOrderIdStr, 10);
    return Number.isNaN(workOrderId) ? null : workOrderId;
  }

  private async publishCompensationForPaymentProblem(params: {
    paymentId: string;
    status: string;
    workOrderId: number | null;
    payload: MercadoPagoWebhookBody;
    payment: MercadoPagoPaymentResponse;
  }): Promise<void> {
    if (params.workOrderId == null) {
      this.logger.warn(
        `Pagamento ${params.paymentId} com problema (${params.status}) sem external_reference válido; compensação não publicada`,
      );
      return;
    }

    await this.sagaEvents.publishCompensate({
      workOrderId: params.workOrderId,
      step: SagaWorkOrderStep.AWAITING_APPROVAL,
      failedStep: SagaWorkOrderStep.AWAITING_APPROVAL,
      reason: `Pagamento com problema: ${params.status || 'unknown'}`,
      debug: {
        webhook: params.payload,
        mercadoPago: params.payment,
      },
    });

    this.logger.warn(
      `Compensação publicada para payment ${params.paymentId} status=${params.status} workOrderId=${params.workOrderId}`,
    );
  }
}
