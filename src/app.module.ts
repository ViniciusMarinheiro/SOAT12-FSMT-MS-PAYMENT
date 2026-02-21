import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomLogger } from './common/log/custom.logger';
import { GlobalJwtAuthGuard } from './common/guards';
import { EnvConfigModule } from './common/service/env/env-config.module';
import { EnvConfigService } from './common/service/env/env-config.service';
import { AuthModule } from './modules/auth/auth.module';
import { PaymentModule } from './modules/payment/payment.module';
import { RabbitMQModule } from './providers/rabbitmq/rabbitmq.module';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import * as newrelic from 'newrelic';

const isTest = process.env.NODE_ENV === 'test';
const isDevelopment = process.env.NODE_ENV !== 'production' && !isTest;

const getNewRelicMetadata = () => {
  try {
    return newrelic.getLinkingMetadata();
  } catch (error) {
    return {};
  }
};

@Module({
  imports: [
    EnvConfigModule,
    AuthModule,
    PaymentModule,
    RabbitMQModule,
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: 'trace',
        mixin: () => {
          return getNewRelicMetadata();
        },
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
        customLogLevel: (req, res, err) => {
          if (res.statusCode >= 500) {
            return 'error';
          } else if (res.statusCode >= 400) {
            return 'warn';
          }
          return 'info';
        },
        ...(isDevelopment && {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
        }),
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CustomLogger,
    EnvConfigService,
    {
      provide: APP_GUARD,
      useClass: GlobalJwtAuthGuard,
    },
  ],
  exports: [EnvConfigService, CustomLogger],
})
export class AppModule {}
