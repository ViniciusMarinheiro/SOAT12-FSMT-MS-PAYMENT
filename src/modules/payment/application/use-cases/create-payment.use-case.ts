import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { EnvConfigService } from "@/common/service/env/env-config.service";
import { CreatePaymentDto } from "../../infrastructure/web/dto/create-payment.dto";

export type MercadoPagoPreferenceResponse = Record<string, unknown>;

@Injectable()
export class CreatePaymentUseCase {
  constructor(private readonly envConfig: EnvConfigService) {}

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
      throw new BadRequestException({
        message: "Mercado Pago request failed",
        statusCode: response.status,
        data,
      });
    }

    return data as MercadoPagoPreferenceResponse;
  }
}
