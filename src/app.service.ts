import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async checkMercadoPagoConnection() {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY;

    if (!accessToken || !publicKey) {
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

      if (!response.ok) {
        return {
          status: 'error',
          message: 'Mercado Pago connection failed',
          statusCode: response.status,
        };
      }

      return { status: 'ok' };
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Mercado Pago connection error',
        error: error?.message,
      };
    }
  }
}
