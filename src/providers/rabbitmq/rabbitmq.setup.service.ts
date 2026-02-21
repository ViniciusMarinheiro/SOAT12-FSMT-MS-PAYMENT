import { Injectable, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';
import { RabbitMQConfig, getRabbitMQConfigs } from './rabbitmq.config';
import { EnvConfigService } from '@/common/service/env/env-config.service';

@Injectable()
export class RabbitMQSetupService {
  private readonly logger = new Logger(RabbitMQSetupService.name);

  constructor(private readonly envConfigService: EnvConfigService) {}

  async createExchangesAndQueues(rabbitmqUrl: string): Promise<void> {
    let connection: amqp.Connection | null = null;
    let channel: amqp.Channel | null = null;

    try {
      connection = await amqp.connect(rabbitmqUrl);
      channel = await connection.createChannel();

      for (const config of getRabbitMQConfigs()) {
        if (config.exchange) {
          await this.createExchangeAndQueue(channel!, config);
        }
      }
    } finally {
      if (channel) await channel.close().catch(() => {});
      if (connection) await connection.close().catch(() => {});
    }
  }

  private async createExchangeAndQueue(
    channel: amqp.Channel,
    config: RabbitMQConfig,
  ): Promise<void> {
    const dlqExchange = config.deadLetterExchange ?? `${config.exchange}.dlq`;
    const dlqQueue = `${config.queue}.dlq`;
    const dlqRoutingKey =
      config.deadLetterRoutingKey ?? `${config.routingKey}.dlq`;

    await channel.assertExchange(dlqExchange, 'direct', {
      durable: true,
      autoDelete: true,
    });
    await channel.assertQueue(dlqQueue, { durable: true });
    await channel.bindQueue(dlqQueue, dlqExchange, dlqRoutingKey);

    await channel.assertExchange(
      config.exchange!,
      config.exchangeType || 'topic',
      { durable: true, autoDelete: true },
    );
    await channel.assertQueue(config.queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': dlqExchange,
        'x-dead-letter-routing-key': dlqRoutingKey,
      },
    });
    await channel.bindQueue(config.queue, config.exchange!, config.routingKey);

    this.logger.log(
      `Aplicação conectada ao RabbitMQ e ouvindo a fila ${config.queue}`,
    );

    this.logger.log(
      `Exchange e fila criadas: ${config.exchange}, ${config.queue}`,
    );
  }
}
