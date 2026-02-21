import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';
import { rabbitMQConfig } from '../rabbitmq.config';
import { SagaWorkOrderStep } from './saga.types';

@Injectable()
export class SagaEventsProvider {
  private readonly logger = new Logger(SagaEventsProvider.name);

  constructor(
    @Inject(rabbitMQConfig.sagaPublish.routingKey)
    private readonly client: ClientProxy,
  ) {}

  async publishCompensate(payload: {
    sagaId?: string;
    workOrderId: number;
    step: SagaWorkOrderStep;
    reason?: string;
    failedStep?: SagaWorkOrderStep;
    debug?: unknown;
  }): Promise<void> {
    const body = {
      ...payload,
      sagaId: payload.sagaId ?? randomUUID(),
      timestamp: new Date().toISOString(),
    };
    await firstValueFrom(this.client.emit('compensate', body));
    this.logger.warn(
      `Saga compensate emitido para step=${payload.step} OS ${payload.workOrderId}`,
      {
        reason: payload.reason,
      },
    );
  }
}
