import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { rabbitMQConfig } from '../rabbitmq.config';
import { EnvConfigService } from '@/common/service/env/env-config.service';

export interface PaymentApprovedPayload {
  workOrderId: number;
  paymentId: string;
  status: string;
  fullPayload?: unknown;
  debug?: unknown;
}

@Injectable()
export class PaymentApprovedQueueProvider {
  private readonly logger = new Logger(PaymentApprovedQueueProvider.name);

  constructor(
    @Inject(rabbitMQConfig.paymentApproved.routingKey)
    private readonly client: ClientProxy,
    private readonly envConfig: EnvConfigService,
  ) {}

  async publish(payload: PaymentApprovedPayload): Promise<void> {
    const url = this.envConfig.get('RABBITMQ_URL');
    if (!url) {
      this.logger.warn('RABBITMQ_URL não definido, publicação ignorada');
      return;
    }
    const config = rabbitMQConfig.paymentApproved;
    this.logger.log(
      `Publicando payment.approved para workOrderId=${payload.workOrderId}`,
    );
    await firstValueFrom(this.client.emit(config.routingKey, payload));
    this.logger.log(`payment.approved publicado com sucesso`);
  }
}
