import { Injectable } from '@nestjs/common';
import { CustomLogger } from './common/log/custom.logger';
import { getAppConfig } from './config/app.config';

@Injectable()
export class AppService {
  constructor(private readonly logger: CustomLogger) {}

  getHello(): string {
    return 'Hello World!';
  }

  async checkMercadoPagoConnection() {
    const config = getAppConfig();
    const accessToken = config.mercadoPago.accessToken;
    const publicKey = config.mercadoPago.publicKey;

    if (!accessToken || !publicKey) {
      this.logger.warn('Missing Mercado Pago credentials');
      return {
        status: 'error',
        message: 'Missing Mercado Pago credentials',
      };
    }

    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const body = await response.clone().json().catch(() => ({}));

      this.logger.log('Mercado Pago response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        response,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error('Mercado Pago connection failed', undefined, {
          statusCode: response.status,
          error: errorData,
        });
        return {
          status: 'error',
          message: 'Mercado Pago connection failed',
          statusCode: response.status,
        };
      }

      return { status: 'ok', id: body.id };
    } catch (error: any) {
      this.logger.error('Mercado Pago connection error', undefined, {
        message: error?.message,
        error: error?.toString(),
      });
      return {
        status: 'error',
        message: 'Mercado Pago connection error',
        error: error?.message,
      };
    }
  }
}
