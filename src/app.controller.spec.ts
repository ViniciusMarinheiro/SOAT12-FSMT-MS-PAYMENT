import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomLogger } from './common/log/custom.logger';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;
  let mockLogger: jest.Mocked<CustomLogger>;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<CustomLogger>;

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return status ok', () => {
      expect(appController.health()).toEqual({ status: 'ok' });
    });
  });

  describe('healthMercadoPago', () => {
    it('should return mercado pago health status from service', async () => {
      // Arrange
      const mockHealthResponse = { status: 'ok', id: 203445 };
      jest.spyOn(appService, 'checkMercadoPagoConnection').mockResolvedValueOnce(mockHealthResponse);

      // Act
      const result = await appController.healthMercadoPago();

      // Assert
      expect(result).toEqual(mockHealthResponse);
      expect(appService.checkMercadoPagoConnection).toHaveBeenCalledTimes(1);
    });

    it('should call checkMercadoPagoConnection on healthMercadoPago endpoint', async () => {
      // Arrange
      jest.spyOn(appService, 'checkMercadoPagoConnection').mockResolvedValueOnce({ status: 'ok', id: 203445 });

      // Act
      await appController.healthMercadoPago();

      // Assert
      expect(appService.checkMercadoPagoConnection).toHaveBeenCalled();
    });
  });
});
