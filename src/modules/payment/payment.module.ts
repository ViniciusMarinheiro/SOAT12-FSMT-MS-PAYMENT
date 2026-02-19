import { Module } from "@nestjs/common";
import { PaymentController } from "./infrastructure/web/payment.controller";
import { CreatePaymentUseCase } from "./application/use-cases/create-payment.use-case";
import { EnvConfigModule } from "@/common/service/env/env-config.module";

@Module({
  imports: [EnvConfigModule],
  controllers: [PaymentController],
  providers: [CreatePaymentUseCase],
  exports: [CreatePaymentUseCase],
})
export class PaymentModule {}
