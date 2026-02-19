import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import type { CreatePaymentDto } from './dto/create-payment.dto';
import { getAppConfig } from '../config/app.config';

type MercadoPagoResponse = Record<string, unknown>;

@Injectable()
export class PaymentService {
  async createPayment(dto: CreatePaymentDto): Promise<MercadoPagoResponse> {
    this.validateCreatePayment(dto);

    const config = getAppConfig();
    const accessToken = config.mercadoPago.accessToken;
    if (!accessToken) {
      throw new InternalServerErrorException(
        'Missing Mercado Pago access token',
      );
    }

    const payload: Record<string, unknown> = {
      items: [
        {
          title: dto.title,
          quantity: dto.quantity,
          unit_price: dto.unitPrice,
          currency_id: dto.currencyId ?? 'BRL',
        },
      ],
    };

    if (dto.payerEmail) {
      payload.payer = { email: dto.payerEmail };
    }

    const response = await fetch(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    const data: unknown = await response.json();

    if (!response.ok) {
      throw new BadRequestException({
        message: 'Mercado Pago request failed',
        statusCode: response.status,
        data,
      });
    }

    return data as MercadoPagoResponse;
  }

  private validateCreatePayment(dto: CreatePaymentDto) {
    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('Invalid request payload');
    }

    if (!dto.title || typeof dto.title !== 'string') {
      throw new BadRequestException('Missing title');
    }

    if (!Number.isFinite(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException('Invalid quantity');
    }

    if (!Number.isFinite(dto.unitPrice) || dto.unitPrice <= 0) {
      throw new BadRequestException('Invalid unitPrice');
    }

    if (dto.currencyId && typeof dto.currencyId !== 'string') {
      throw new BadRequestException('Invalid currencyId');
    }

    if (dto.payerEmail && typeof dto.payerEmail !== 'string') {
      throw new BadRequestException('Invalid payerEmail');
    }
  }
}
