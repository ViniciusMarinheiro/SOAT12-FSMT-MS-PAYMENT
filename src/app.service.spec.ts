import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { CustomLogger } from './common/log/custom.logger';
import { EnvConfigService } from './common/service/env/env-config.service';

describe('AppService', () => {
  let appService: AppService;
  let mockLogger: jest.Mocked<CustomLogger>;
  let mockEnvConfig: jest.Mocked<EnvConfigService>;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<CustomLogger>;

    mockEnvConfig = {
      get: jest.fn((key: string) => {
        if (key === 'MERCADOPAGO_ACCESS_TOKEN') return 'test_access_token';
        if (key === 'MERCADOPAGO_PUBLIC_KEY') return 'test_public_key';
        return '';
      }),
    } as unknown as jest.Mocked<EnvConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: CustomLogger, useValue: mockLogger },
        { provide: EnvConfigService, useValue: mockEnvConfig },
      ],
    }).compile();

    appService = module.get(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkMercadoPagoConnection', () => {
    it('should return status ok when connection is successful', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({ id: 123456789 }),
        clone: jest.fn().mockReturnValue({
          json: jest.fn().mockResolvedValue({ id: 203445 }),
        }),
      };
      global.fetch = jest.fn().mockResolvedValueOnce(mockResponse);

      const result = await appService.checkMercadoPagoConnection();

      expect(result).toEqual({ status: 'ok', id: 203445 });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/users/me',
        {
          headers: { Authorization: 'Bearer test_access_token' },
        },
      );
    });

    it('should return error when credentials are missing', async () => {
      mockEnvConfig.get.mockReturnValue('');

      const result = await appService.checkMercadoPagoConnection();

      expect(result).toEqual({
        status: 'error',
        message: 'Missing Mercado Pago credentials',
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Missing Mercado Pago credentials',
      );
    });

    it('should return error when API response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
        clone: jest.fn().mockReturnValue({
          json: jest.fn().mockResolvedValue({}),
        }),
      };
      global.fetch = jest.fn().mockResolvedValueOnce(mockResponse);

      const result = await appService.checkMercadoPagoConnection();

      expect(result).toEqual({
        status: 'error',
        message: 'Mercado Pago connection failed',
        statusCode: 401,
      });
    });
  });
});
