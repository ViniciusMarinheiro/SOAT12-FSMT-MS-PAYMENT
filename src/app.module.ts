import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { CustomLogger } from './common/log/custom.logger';
import { PaymentController } from './payments/payment.controller';
import { PaymentService } from './payments/payment.service';

const isTest = process.env.NODE_ENV === 'test';
const isDevelopment = process.env.NODE_ENV !== 'production' && !isTest;

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: 'trace',
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
  controllers: [AppController, PaymentController],
  providers: [AppService, CustomLogger, PaymentService],
  exports: [CustomLogger],
})
export class AppModule {}
