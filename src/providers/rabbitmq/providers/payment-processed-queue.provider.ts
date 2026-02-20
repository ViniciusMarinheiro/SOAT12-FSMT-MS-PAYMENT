import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { rabbitMQConfig } from '../rabbitmq.config';
import { EnvConfigService } from '@/common/service/env/env-config.service';

export interface PaymentProcessedPayload {
  workOrderId: number;
  paymentId: string;
  status: string;
  init_point?: string;
  error?: string;
}

@Injectable()
export class PaymentProcessedQueueProvider {
  private readonly logger = new Logger(PaymentProcessedQueueProvider.name);

  constructor(
    @Inject(rabbitMQConfig.paymentProcessed.routingKey)
    private readonly client: ClientProxy,
    private readonly envConfig: EnvConfigService,
  ) {}

  async publish(payload: PaymentProcessedPayload): Promise<void> {
    const url = this.envConfig.get('RABBITMQ_URL');
    if (!url) {
      this.logger.warn('RABBITMQ_URL não definido, publicação ignorada');
      return;
    }
    const config = rabbitMQConfig.paymentProcessed;
    this.logger.log(
      `Publicando payment.processed para workOrderId=${payload.workOrderId}`,
    );
    await firstValueFrom(this.client.emit(config.routingKey, payload));
    this.logger.log(`payment.processed publicado com sucesso`);
  }
}
