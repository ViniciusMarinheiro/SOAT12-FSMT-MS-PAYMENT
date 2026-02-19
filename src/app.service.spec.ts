import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { CustomLogger } from './common/log/custom.logger';
import { resetAppConfig } from './config/app.config';

describe('AppService', () => {
  let appService: AppService;
  let mockLogger: jest.Mocked<CustomLogger>;

  beforeEach(async () => {
    resetAppConfig();

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<CustomLogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    appService = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      const result = appService.getHello();
      expect(result).toBe('Hello World!');
    });
  });

  describe('checkMercadoPagoConnection', () => {
    it('should return status ok when connection is successful', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({ id: 123456789, nickname: 'TEST_USER' }),
        clone: jest.fn().mockReturnValue({
          json: jest.fn().mockResolvedValue({ id: 203445, nickname: 'TEST_USER' }),
        }),
      };

      global.fetch = jest.fn().mockResolvedValueOnce(mockResponse);
      process.env.MERCADOPAGO_ACCESS_TOKEN = 'test_access_token';
      process.env.MERCADOPAGO_PUBLIC_KEY = 'test_public_key';

      // Act
      const result = await appService.checkMercadoPagoConnection();

      // Assert
      expect(result).toEqual({ status: 'ok', id: 203445 });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/users/me',
        {
          headers: {
            Authorization: 'Bearer test_access_token',
          },
        },
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Mercado Pago response received',
        expect.objectContaining({
          status: 200,
          statusText: 'OK',
          ok: true,
        }),
      );
    });

    it('should log response details on successful connection', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({}),
        clone: jest.fn().mockReturnValue({
          json: jest.fn().mockResolvedValue({ id: 203445 }),
        }),
      };

      global.fetch = jest.fn().mockResolvedValueOnce(mockResponse);
      process.env.MERCADOPAGO_ACCESS_TOKEN = 'test_access_token';
      process.env.MERCADOPAGO_PUBLIC_KEY = 'test_public_key';

      // Act
      await appService.checkMercadoPagoConnection();

      // Assert
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Mercado Pago response received'),
        expect.any(Object),
      );
    });

    it('should use correct authorization header with access token', async () => {
      // Arrange
      const accessToken = 'my_special_access_token_123';
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({}),
        clone: jest.fn().mockReturnValue({
          json: jest.fn().mockResolvedValue({ id: 203445 }),
        }),
      };

      global.fetch = jest.fn().mockResolvedValueOnce(mockResponse);
      process.env.MERCADOPAGO_ACCESS_TOKEN = accessToken;
      process.env.MERCADOPAGO_PUBLIC_KEY = 'test_public_key';

      // Act
      await appService.checkMercadoPagoConnection();

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
    });

    it('should call the correct Mercado Pago endpoint', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({}),
        clone: jest.fn().mockReturnValue({
          json: jest.fn().mockResolvedValue({ id: 203445 }),
        }),
      };

      global.fetch = jest.fn().mockResolvedValueOnce(mockResponse);
      process.env.MERCADOPAGO_ACCESS_TOKEN = 'test_access_token';
      process.env.MERCADOPAGO_PUBLIC_KEY = 'test_public_key';

      // Act
      await appService.checkMercadoPagoConnection();

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/users/me',
        expect.any(Object),
      );
    });
  });
});
