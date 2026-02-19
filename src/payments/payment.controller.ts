import { Body, Controller, Headers, Logger, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PaymentService } from './payment.service';
import type { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Public()
  async create(@Body() body: CreatePaymentDto) {
    return this.paymentService.createPayment(body);
  }

  @Post('webhook')
  @Public()
  webhook(@Body() body: unknown, @Headers() headers: unknown) {
    this.logger.log('Mercado Pago webhook received', {
      body,
      headers,
    });

    return { status: 'ok' };
  }
}
