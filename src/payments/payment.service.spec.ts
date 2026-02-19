import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import type { CreatePaymentDto } from './dto/create-payment.dto';
import { resetAppConfig } from '../config/app.config';

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    resetAppConfig();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentService],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment preference with valid DTO', async () => {
      const dto: CreatePaymentDto = {
        title: 'Test Product',
        quantity: 1,
        unitPrice: 100,
      };

      const mockResponse = {
        id: 'preference_123',
        client_id: 'client_456',
        init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=preference_123',
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST_TOKEN';

      const result = await service.createPayment(dto);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/checkout/preferences',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer TEST_TOKEN',
          }),
        }),
      );
    });

    it('should throw InternalServerErrorException when access token is missing', async () => {
      const dto: CreatePaymentDto = {
        title: 'Test Product',
        quantity: 1,
        unitPrice: 100,
      };

      delete process.env.MERCADOPAGO_ACCESS_TOKEN;

      await expect(service.createPayment(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw BadRequestException when response is not ok', async () => {
      const dto: CreatePaymentDto = {
        title: 'Test Product',
        quantity: 1,
        unitPrice: 100,
      };

      const errorResponse = {
        error: 'Invalid request',
        status: 400,
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValueOnce(errorResponse),
      });

      process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST_TOKEN';

      await expect(service.createPayment(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include payer email when provided', async () => {
      const dto: CreatePaymentDto = {
        title: 'Test Product',
        quantity: 1,
        unitPrice: 100,
        payerEmail: 'customer@email.com',
      };

      const mockResponse = {
        id: 'preference_123',
        init_point: 'https://url.test',
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST_TOKEN';

      await service.createPayment(dto);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.payer).toEqual({ email: 'customer@email.com' });
    });

    it('should use default currency BRL when not provided', async () => {
      const dto: CreatePaymentDto = {
        title: 'Test Product',
        quantity: 1,
        unitPrice: 100,
      };

      const mockResponse = {
        id: 'preference_123',
        init_point: 'https://url.test',
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST_TOKEN';

      await service.createPayment(dto);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.items[0].currency_id).toBe('BRL');
    });

    it('should use custom currency when provided', async () => {
      const dto: CreatePaymentDto = {
        title: 'Test Product',
        quantity: 1,
        unitPrice: 100,
        currencyId: 'USD',
      };

      const mockResponse = {
        id: 'preference_123',
        init_point: 'https://url.test',
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST_TOKEN';

      await service.createPayment(dto);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.items[0].currency_id).toBe('USD');
    });
  });

  describe('validateCreatePayment', () => {
    it('should throw BadRequestException for missing title', () => {
      const dto = {
        quantity: 1,
        unitPrice: 100,
      } as CreatePaymentDto;

      expect(() =>
        (service as any).validateCreatePayment(dto),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid quantity', () => {
      const dto: CreatePaymentDto = {
        title: 'Test',
        quantity: 0,
        unitPrice: 100,
      };

      expect(() =>
        (service as any).validateCreatePayment(dto),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid unitPrice', () => {
      const dto: CreatePaymentDto = {
        title: 'Test',
        quantity: 1,
        unitPrice: -10,
      };

      expect(() =>
        (service as any).validateCreatePayment(dto),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid payerEmail', () => {
      const dto: CreatePaymentDto = {
        title: 'Test',
        quantity: 1,
        unitPrice: 100,
        payerEmail: 123 as any,
      };

      expect(() =>
        (service as any).validateCreatePayment(dto),
      ).toThrow(BadRequestException);
    });
  });
});
