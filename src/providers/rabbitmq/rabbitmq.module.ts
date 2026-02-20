import { Module, forwardRef } from "@nestjs/common";
import { EnvConfigModule } from "@/common/service/env/env-config.module";
import { RabbitMQSetupService } from "./rabbitmq.setup.service";
import { getRabbitMQConfigs } from "./rabbitmq.config";
import { RabbitMQService } from "./rabbitmq.service";
import { PaymentApprovedQueueProvider } from "./providers/payment-approved-queue.provider";
import { PaymentProcessedQueueProvider } from "./providers/payment-processed-queue.provider";
import { RabbitMQPaymentController } from "./rabbitmq-payment.controller";
import { PaymentModule } from "@/modules/payment/payment.module";

@Module({
  imports: [
    EnvConfigModule,
    forwardRef(() => PaymentModule),
    ...getRabbitMQConfigs().map((c) => RabbitMQService.registerClient(c)),
  ],
  controllers: [RabbitMQPaymentController],
  providers: [
    RabbitMQSetupService,
    PaymentApprovedQueueProvider,
    PaymentProcessedQueueProvider,
  ],
  exports: [
    RabbitMQSetupService,
    PaymentApprovedQueueProvider,
    PaymentProcessedQueueProvider,
  ],
})
export class RabbitMQModule {}
