import { Body, Controller, Headers, Logger, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { CreatePaymentUseCase } from '../../application/use-cases/create-payment.use-case';
import { HandlePaymentWebhookUseCase } from '../../application/use-cases/handle-payment-webhook.use-case';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { WebhookMercadoPagoDto } from './dto/webhook-mercadopago.dto';

@ApiTags('payment')
@Controller('payments')
@ApiBearerAuth('Bearer')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly handlePaymentWebhookUseCase: HandlePaymentWebhookUseCase,
  ) {}

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
    description:
      'Recebe notificações do Mercado Pago (type + data.id). Quando type=payment e o pagamento está aprovado, notifica o MS-ORDER via fila. Para testar: envie type "payment" e data.id com o ID do pagamento.',
  })
  @ApiBody({
    type: WebhookMercadoPagoDto,
    description:
      'Payload do webhook: type (ex: "payment") e data.id (ID do pagamento no Mercado Pago)',
    examples: {
      testPayment: {
        summary: 'Testar notificação de pagamento',
        description:
          'Envie para simular o webhook do Mercado Pago com um pagamento.',
        value: {
          type: 'payment',
          data: { id: '123456789' },
        },
      },
      withAction: {
        summary: 'Com action (alternativa ao type)',
        value: {
          action: 'payment',
          data: { id: '123456789' },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Webhook recebido (sempre retorna ok; eventos não tratados são ignorados).',
    schema: {
      type: 'object',
      properties: { status: { type: 'string', example: 'ok' } },
    },
  })
  async webhook(
    @Body() body: WebhookMercadoPagoDto,
    @Headers() headers: Record<string, string>,
  ): Promise<{ status: string }> {
    this.logger.log('Mercado Pago webhook received', { body, headers });
    await this.handlePaymentWebhookUseCase.execute(body);
    return { status: 'ok' };
  }
}
