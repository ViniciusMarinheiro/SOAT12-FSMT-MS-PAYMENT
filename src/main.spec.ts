import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomLogger } from './common/log/custom.logger';
import { EnvConfigService } from './common/service/env/env-config.service';
import { RabbitMQSetupService } from './providers/rabbitmq/rabbitmq.setup.service';
import { bootstrap } from './main';

jest.mock('@nestjs/core');
jest.mock('@nestjs/swagger', () => {
  const actual = jest.requireActual('@nestjs/swagger');
  return {
    ...actual,
    DocumentBuilder: jest.fn().mockImplementation(() => ({
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setVersion: jest.fn().mockReturnThis(),
      addBearerAuth: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    })),
    SwaggerModule: {
      ...actual.SwaggerModule,
      createDocument: jest.fn().mockReturnValue({}),
      setup: jest.fn(),
    },
  };
});

describe('main.ts bootstrap', () => {
  let mockApp: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApp = {
      useLogger: jest.fn().mockReturnThis(),
      enableCors: jest.fn().mockReturnThis(),
      useGlobalPipes: jest.fn().mockReturnThis(),
      setGlobalPrefix: jest.fn().mockReturnThis(),
      use: jest.fn().mockReturnThis(),
      connectMicroservice: jest.fn().mockReturnThis(),
      startAllMicroservices: jest.fn().mockResolvedValue(undefined),
      getHttpAdapter: jest.fn().mockReturnValue({
        get: jest.fn(),
        getType: jest.fn().mockReturnValue('http'),
      }),
      get: jest.fn((token: any) => {
        if (token === CustomLogger) return {};
        if (token === EnvConfigService) {
          return {
            get: (k: string) =>
              k === 'PORT'
                ? '3000'
                : k === 'RABBITMQ_URL'
                  ? 'amqp://localhost'
                  : 'api',
          };
        }
        if (token === RabbitMQSetupService) {
          return {
            createExchangesAndQueues: jest.fn().mockResolvedValue(undefined),
          };
        }
        return {};
      }),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as jest.Mock).mockResolvedValue(mockApp);
  });

  it('should create NestJS application', async () => {
    await bootstrap();
    expect(NestFactory.create).toHaveBeenCalledWith(AppModule, {
      logger: ['error', 'warn', 'debug', 'log', 'verbose'],
    });
  });

  it('should use ValidationPipe and listen on port', async () => {
    await bootstrap();
    expect(mockApp.useGlobalPipes).toHaveBeenCalled();
    expect(mockApp.listen).toHaveBeenCalledWith(3000);
  });
});
