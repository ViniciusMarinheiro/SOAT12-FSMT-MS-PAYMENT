import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  let service: PaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [PaymentService],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /payments', () => {
    it('should call createPayment with valid DTO', async () => {
      const dto = {
        title: 'Test Product',
        quantity: 1,
        unitPrice: 100,
      };

      const mockResponse = {
        id: 'preference_123',
        init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect',
      };

      jest.spyOn(service, 'createPayment').mockResolvedValueOnce(mockResponse);

      const result = await controller.create(dto);

      expect(result).toEqual(mockResponse);
      expect(service.createPayment).toHaveBeenCalledWith(dto);
    });

    it('should return Mercado Pago response', async () => {
      const dto = {
        title: 'Test Product',
        quantity: 2,
        unitPrice: 50.5,
        payerEmail: 'test@email.com',
      };

      const mockResponse = {
        id: 'pref_456',
        client_id: 'client_789',
        init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_456',
        sandbox_init_point:
          'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_456',
      };

      jest.spyOn(service, 'createPayment').mockResolvedValueOnce(mockResponse);

      const result = await controller.create(dto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('init_point');
    });
  });

  describe('POST /payments/webhook', () => {
    it('should log webhook and return status ok', () => {
      const body = {
        action: 'payment.created',
        data: {
          id: 'payment_123',
        },
      };

      const headers = {
        'content-type': 'application/json',
        'x-signature': 'mock-signature',
      };

      const logSpy = jest.spyOn(controller['logger'], 'log');

      const result = controller.webhook(body, headers);

      expect(result).toEqual({ status: 'ok' });
      expect(logSpy).toHaveBeenCalledWith('Mercado Pago webhook received', {
        body,
        headers,
      });
    });

    it('should handle webhook with payment.updated action', () => {
      const body = {
        action: 'payment.updated',
        data: {
          id: 'payment_456',
          status: 'completed',
        },
      };

      const headers = {};

      const result = controller.webhook(body, headers);

      expect(result).toEqual({ status: 'ok' });
    });

    it('should handle webhook with unknown payload', () => {
      const body = { random: 'data' };
      const headers = {};

      const logSpy = jest.spyOn(controller['logger'], 'log');

      const result = controller.webhook(body, headers);

      expect(result).toEqual({ status: 'ok' });
      expect(logSpy).toHaveBeenCalled();
    });
  });
});
