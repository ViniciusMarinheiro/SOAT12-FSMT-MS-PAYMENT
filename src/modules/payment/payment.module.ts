import { Module } from '@nestjs/common';
import { PaymentController } from './infrastructure/web/payment.controller';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case';
import { HandlePaymentWebhookUseCase } from './application/use-cases/handle-payment-webhook.use-case';
import { EnvConfigModule } from '@/common/service/env/env-config.module';
import { RabbitMQModule } from '@/providers/rabbitmq/rabbitmq.module';

@Module({
  imports: [EnvConfigModule, RabbitMQModule],
  controllers: [PaymentController],
  providers: [CreatePaymentUseCase, HandlePaymentWebhookUseCase],
  exports: [CreatePaymentUseCase],
})
export class PaymentModule {}
