import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomLogger } from './common/log/custom.logger';
import { EnvConfigService } from './common/service/env/env-config.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<CustomLogger>;

    const mockEnvConfig = {
      get: jest.fn((key: string) => {
        if (key === 'MERCADOPAGO_ACCESS_TOKEN') return 'test_token';
        if (key === 'MERCADOPAGO_PUBLIC_KEY') return 'test_public_key';
        return '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: CustomLogger, useValue: mockLogger },
        { provide: EnvConfigService, useValue: mockEnvConfig },
      ],
    }).compile();

    appController = module.get(AppController);
    appService = module.get(AppService);
  });

  describe('health', () => {
    it('should return status ok', () => {
      expect(appController.health()).toEqual({ status: 'ok' });
    });
  });

  describe('healthMercadoPago', () => {
    it('should return mercado pago health status from service', async () => {
      const mockHealthResponse = { status: 'ok', id: 203445 };
      jest
        .spyOn(appService, 'checkMercadoPagoConnection')
        .mockResolvedValueOnce(mockHealthResponse);

      const result = await appController.healthMercadoPago();

      expect(result).toEqual(mockHealthResponse);
      expect(appService.checkMercadoPagoConnection).toHaveBeenCalledTimes(1);
    });
  });
});
