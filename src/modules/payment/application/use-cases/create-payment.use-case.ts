import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { EnvConfigService } from "@/common/service/env/env-config.service";
import { CreatePaymentDto } from "../../infrastructure/web/dto/create-payment.dto";
import { SagaEventsProvider } from '@/providers/rabbitmq/saga/saga-events.provider';
import { SagaWorkOrderStep } from '@/providers/rabbitmq/saga/saga.types';

export type MercadoPagoPreferenceResponse = Record<string, unknown>;

@Injectable()
export class CreatePaymentUseCase {
  constructor(
    private readonly envConfig: EnvConfigService,
    private readonly sagaEvents: SagaEventsProvider,
  ) {}

  async execute(dto: CreatePaymentDto): Promise<MercadoPagoPreferenceResponse> {
    const accessToken = this.envConfig.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new InternalServerErrorException(
        "Missing Mercado Pago access token",
      );
    }

    const payload: Record<string, unknown> = {
      items: [
        {
          title: dto.title,
          quantity: dto.quantity,
          unit_price: dto.unitPrice,
          currency_id: dto.currencyId ?? "BRL",
        },
      ],
    };

    if (dto.payerEmail) {
      payload.payer = { email: dto.payerEmail };
    }

    if (dto.workOrderId != null) {
      payload.external_reference = String(dto.workOrderId);
    }

    try {
      const response = await fetch(
        "https://api.mercadopago.com/checkout/preferences",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        await this.publishPaymentCompensationIfPossible({
          dto,
          reason: 'Mercado Pago request failed',
          debug: {
            statusCode: response.status,
            request: payload,
            mercadoPago: data,
          },
        });

        throw new BadRequestException({
          message: "Mercado Pago request failed",
          statusCode: response.status,
          data,
        });
      }

      return data as MercadoPagoPreferenceResponse;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      await this.publishPaymentCompensationIfPossible({
        dto,
        reason: error instanceof Error ? error.message : 'Erro desconhecido',
        debug: {
          request: payload,
          mercadoPago: {
            error: error instanceof Error ? error.message : String(error),
          },
        },
      });

      throw error;
    }
  }

  private async publishPaymentCompensationIfPossible(params: {
    dto: CreatePaymentDto;
    reason: string;
    debug: unknown;
  }): Promise<void> {
    if (params.dto.workOrderId == null) return;

    await this.sagaEvents.publishCompensate({
      workOrderId: params.dto.workOrderId,
      step: SagaWorkOrderStep.AWAITING_APPROVAL,
      failedStep: SagaWorkOrderStep.AWAITING_APPROVAL,
      reason: params.reason,
      debug: params.debug,
    });
  }
}
