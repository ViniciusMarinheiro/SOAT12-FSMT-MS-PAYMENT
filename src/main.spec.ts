import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomLogger } from './common/log/custom.logger';
import { bootstrap } from './main';
import { resetAppConfig } from './config/app.config';

jest.mock('@nestjs/core');
jest.mock('./app.module');
jest.mock('./common/log/custom.logger');

describe('main.ts bootstrap', () => {
  let mockApp: any;
  let mockCustomLogger: any;

  beforeEach(() => {
    resetAppConfig();
    jest.clearAllMocks();

    // Mock CustomLogger instance
    mockCustomLogger = {};

    // Mock NestJS app
    mockApp = {
      useLogger: jest.fn().mockReturnThis(),
      listen: jest.fn().mockResolvedValue(undefined),
      get: jest.fn((token) => {
        if (token === CustomLogger) {
          return mockCustomLogger;
        }
        return {};
      }),
    };

    // Mock NestFactory.create
    (NestFactory.create as jest.Mock).mockResolvedValue(mockApp);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.PORT;
  });

  it('should create NestJS application', async () => {
    await bootstrap();

    expect(NestFactory.create).toHaveBeenCalledWith(AppModule, {
      logger: ['error', 'warn', 'debug', 'log', 'verbose'],
    });
  });

  it('should use CustomLogger for the application', async () => {
    await bootstrap();

    expect(mockApp.useLogger).toHaveBeenCalledWith(mockCustomLogger);
  });

  it('should listen on configured port', async () => {
    process.env.PORT = '3001';
    resetAppConfig();

    await bootstrap();

    expect(mockApp.listen).toHaveBeenCalledWith(3001);
  });

  it('should listen on default port 3000 if PORT not set', async () => {
    delete process.env.PORT;

    await bootstrap();

    expect(mockApp.listen).toHaveBeenCalledWith(3000);
  });

  it('should retrieve CustomLogger instance via app.get()', async () => {
    await bootstrap();

    expect(mockApp.get).toHaveBeenCalledWith(CustomLogger);
  });

  it('should handle async operations correctly', async () => {
    const result = bootstrap();

    expect(result).toBeInstanceOf(Promise);

    await result;

    expect(NestFactory.create).toHaveBeenCalled();
    expect(mockApp.useLogger).toHaveBeenCalled();
    expect(mockApp.listen).toHaveBeenCalled();
  });
});

