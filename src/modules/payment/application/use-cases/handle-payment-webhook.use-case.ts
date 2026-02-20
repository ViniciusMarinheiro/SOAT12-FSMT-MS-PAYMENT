import { Injectable, Logger } from '@nestjs/common';
import { EnvConfigService } from '@/common/service/env/env-config.service';
import { PaymentApprovedQueueProvider } from '@/providers/rabbitmq/providers/payment-approved-queue.provider';

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
  ) {}

  async execute(body: unknown): Promise<void> {
    const payload = body as MercadoPagoWebhookBody;
    if (!payload?.type && !payload?.action) {
      this.logger.debug('Webhook ignorado: sem type/action');
      return;
    }

    const type = payload.type ?? payload.action;
    if (type !== 'payment') {
      this.logger.debug(`Webhook ignorado: type=${type}`);
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
      if (status !== 'approved') {
        this.logger.debug(`Pagamento ${paymentId} status=${status}, ignorado`);
        return;
      }

      const workOrderIdStr = payment.external_reference;
      if (!workOrderIdStr) {
        this.logger.warn(`Pagamento ${paymentId} sem external_reference`);
        return;
      }

      const workOrderId = parseInt(workOrderIdStr, 10);
      if (Number.isNaN(workOrderId)) {
        this.logger.warn(
          `Pagamento ${paymentId} external_reference inválido: ${workOrderIdStr}`,
        );
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
}
