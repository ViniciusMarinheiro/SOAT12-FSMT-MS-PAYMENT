import { ClientsModule, Transport } from '@nestjs/microservices';
import { MessageConfig } from './types/message.interface';
import { EnvConfigService } from '@/common/service/env/env-config.service';
import { EnvConfigModule } from '@/common/service/env/env-config.module';
import { getRabbitMQConfigs } from './rabbitmq.config';

export class RabbitMQService {
  constructor(private readonly configService: EnvConfigService) {}

  createClientOptions(config: MessageConfig) {
    const url = this.configService.get('RABBITMQ_URL') || 'amqp://localhost';
    const options: any = {
      transport: Transport.RMQ,
      options: {
        urls: [url],
        queue: config.queue,
        noAck: true,
        persistent: true,
        queueOptions: {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': config.deadLetterExchange || 'DLX',
            'x-dead-letter-routing-key':
              config.deadLetterRoutingKey || config.queue,
          },
        },
      },
    };
    if (config.exchange) options.options.exchange = config.exchange;
    if (config.routingKey) options.options.routingKey = config.routingKey;
    return options;
  }

  static registerClient(config: MessageConfig) {
    return ClientsModule.registerAsync([
      {
        name: config.routingKey,
        imports: [EnvConfigModule],
        inject: [EnvConfigService],
        useFactory: (configService: EnvConfigService) => {
          const service = new RabbitMQService(configService);
          return service.createClientOptions(config);
        },
      },
    ]);
  }
}
