import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CustomLogger } from './common/log/custom.logger';
import { EnvConfigService } from './common/service/env/env-config.service';
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
