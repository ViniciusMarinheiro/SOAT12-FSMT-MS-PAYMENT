require('newrelic');
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CustomLogger } from './common/log/custom.logger';
import { EnvConfigService } from './common/service/env/env-config.service';
import { RabbitMQSetupService } from './providers/rabbitmq/rabbitmq.setup.service';
import { getConsumerConfigs } from './providers/rabbitmq/rabbitmq.config';
import helmet from 'helmet';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });

  app.useLogger(app.get(CustomLogger));

  const logger = new Logger('MAIN');

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, x-time-zone',
    credentials: false,
  });

  const envConfigService = app.get(EnvConfigService);
  const port = parseInt(envConfigService.get('PORT'), 10);
  const prefix = envConfigService.get('DOCUMENTATION_PREFIX');
  const rabbitmqUrl = envConfigService.get('RABBITMQ_URL');

  if (!rabbitmqUrl) {
    throw new Error('RABBITMQ_URL não configurada. Startup abortado.');
  }

  try {
    const setup = app.get(RabbitMQSetupService);
    await setup.createExchangesAndQueues(rabbitmqUrl);
    logger.log('RabbitMQ exchanges e filas criadas');

    for (const consumer of getConsumerConfigs()) {
      app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: consumer.queue,
          noAck: false,
          queueOptions: {
            durable: true,
            arguments: {
              'x-dead-letter-exchange':
                consumer.deadLetterExchange || `${consumer.exchange}.dlq`,
              'x-dead-letter-routing-key':
                consumer.deadLetterRoutingKey || `${consumer.routingKey}.dlq`,
            },
          },
        },
      });

      logger.log(`RabbitMQ consumer registrado para fila ${consumer.queue}`);
    }

    await app.startAllMicroservices();
    logger.log('RabbitMQ microservices iniciados');
  } catch (err: unknown) {
    logger.error(
      'Falha ao iniciar consumidor RabbitMQ. Startup abortado.',
      err instanceof Error ? err.stack : String(err),
    );
    throw err;
  }

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.setGlobalPrefix(prefix);
  app.use(helmet());

  const config = new DocumentBuilder()
    .setTitle('P&S Tech - 12SOAT Payment Service')
    .setDescription('Microserviço de Pagamentos (Mercado Pago)')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Token',
      },
      'Bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${prefix}/documentation`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  app
    .getHttpAdapter()
    .get(`/${prefix}/documentation/json`, (req: any, res: any) => {
      res.send(document);
    });

  await app.listen(port);
  logger.log(`HTTP server started on port ${port}`);
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
