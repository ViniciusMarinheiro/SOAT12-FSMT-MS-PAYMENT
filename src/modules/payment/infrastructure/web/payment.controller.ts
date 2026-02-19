import { Body, Controller, Headers, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { CreatePaymentUseCase } from '../../application/use-cases/create-payment.use-case';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payment')
@Controller('payments')
@ApiBearerAuth('Bearer')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly createPaymentUseCase: CreatePaymentUseCase) {}

  @Post()
  @Public()
  @ApiOperation({
    summary: 'Criar preferência de pagamento',
    description:
      'Cria uma preferência de checkout no Mercado Pago e retorna o link de pagamento.',
  })
  async create(@Body() dto: CreatePaymentDto) {
    return this.createPaymentUseCase.execute(dto);
  }

  @Post('webhook')
  @Public()
  @ApiOperation({
    summary: 'Webhook Mercado Pago',
    description: 'Recebe notificações do Mercado Pago (payment.created, etc.).',
  })
  webhook(@Body() body: unknown, @Headers() headers: unknown) {
    this.logger.log('Mercado Pago webhook received', { body, headers });
    return { status: 'ok' };
  }
}
