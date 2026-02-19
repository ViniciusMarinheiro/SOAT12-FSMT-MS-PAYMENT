import { Module } from "@nestjs/common";
import { EnvConfigModule } from "@/common/service/env/env-config.module";
import { RabbitMQSetupService } from "./rabbitmq.setup.service";
import { getRabbitMQConfigs } from "./rabbitmq.config";
import { RabbitMQService } from "./rabbitmq.service";
import { PaymentApprovedQueueProvider } from "./providers/payment-approved-queue.provider";

@Module({
  imports: [
    EnvConfigModule,
    ...getRabbitMQConfigs().map((c) => RabbitMQService.registerClient(c)),
  ],
  providers: [RabbitMQSetupService, PaymentApprovedQueueProvider],
  exports: [RabbitMQSetupService, PaymentApprovedQueueProvider],
})
export class RabbitMQModule {}
