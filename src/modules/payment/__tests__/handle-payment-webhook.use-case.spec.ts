import { Test, TestingModule } from '@nestjs/testing';
import { HandlePaymentWebhookUseCase } from '../application/use-cases/handle-payment-webhook.use-case';
import { EnvConfigService } from '@/common/service/env/env-config.service';
import { PaymentApprovedQueueProvider } from '@/providers/rabbitmq/providers/payment-approved-queue.provider';
import { SagaEventsProvider } from '@/providers/rabbitmq/saga/saga-events.provider';
import { SagaWorkOrderStep } from '@/providers/rabbitmq/saga/saga.types';

describe('HandlePaymentWebhookUseCase', () => {
  let useCase: HandlePaymentWebhookUseCase;
  let envConfig: jest.Mocked<EnvConfigService>;
  let paymentApprovedQueue: jest.Mocked<PaymentApprovedQueueProvider>;
  let sagaEvents: jest.Mocked<SagaEventsProvider>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandlePaymentWebhookUseCase,
        {
          provide: EnvConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('TEST_TOKEN'),
          },
        },
        {
          provide: PaymentApprovedQueueProvider,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: SagaEventsProvider,
          useValue: {
            publishCompensate: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(HandlePaymentWebhookUseCase);
    envConfig = module.get(EnvConfigService) as jest.Mocked<EnvConfigService>;
    paymentApprovedQueue = module.get(
      PaymentApprovedQueueProvider,
    ) as jest.Mocked<PaymentApprovedQueueProvider>;
    sagaEvents = module.get(SagaEventsProvider) as jest.Mocked<SagaEventsProvider>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock | undefined)?.mockClear?.();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should ignore webhook when type is not payment', async () => {
    global.fetch = jest.fn();

    await useCase.execute({ type: 'merchant_order', data: { id: '123' } });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(paymentApprovedQueue.publish).not.toHaveBeenCalled();
    expect(sagaEvents.publishCompensate).not.toHaveBeenCalled();
  });

  it('should publish approved payment', async () => {
    const webhookPayload = { type: 'payment', data: { id: '123' } };
    const paymentResponse = {
      id: 123,
      status: 'approved',
      external_reference: '10',
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(paymentResponse),
    });

    await useCase.execute(webhookPayload);

    expect(envConfig.get).toHaveBeenCalledWith('MERCADOPAGO_ACCESS_TOKEN');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.mercadopago.com/v1/payments/123',
      {
        headers: { Authorization: 'Bearer TEST_TOKEN' },
      },
    );
    expect(paymentApprovedQueue.publish).toHaveBeenCalledWith({
      workOrderId: 10,
      paymentId: '123',
      status: 'approved',
      fullPayload: {
        webhook: webhookPayload,
        payment: paymentResponse,
      },
      debug: {
        webhook: webhookPayload,
        payment: paymentResponse,
      },
    });
    expect(sagaEvents.publishCompensate).not.toHaveBeenCalled();
  });

  it('should not compensate when payment is pending', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 123,
          status: 'pending',
          external_reference: '10',
        }),
    });

    await useCase.execute({ type: 'payment', data: { id: '123' } });

    expect(paymentApprovedQueue.publish).not.toHaveBeenCalled();
    expect(sagaEvents.publishCompensate).not.toHaveBeenCalled();
  });

  it('should publish compensate when payment failed', async () => {
    const webhookPayload = { type: 'payment', data: { id: '123' } };
    const paymentResponse = {
      id: 123,
      status: 'rejected',
      external_reference: '10',
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(paymentResponse),
    });

    await useCase.execute(webhookPayload);

    expect(paymentApprovedQueue.publish).not.toHaveBeenCalled();
    expect(sagaEvents.publishCompensate).toHaveBeenCalledWith({
      workOrderId: 10,
      step: SagaWorkOrderStep.AWAITING_APPROVAL,
      failedStep: SagaWorkOrderStep.AWAITING_APPROVAL,
      reason: 'Pagamento com problema: rejected',
      debug: {
        webhook: webhookPayload,
        mercadoPago: paymentResponse,
      },
    });
  });

  it('should ignore when payload has no type and no action', async () => {
    global.fetch = jest.fn();
    await useCase.execute({});
    expect(global.fetch).not.toHaveBeenCalled();
    expect(paymentApprovedQueue.publish).not.toHaveBeenCalled();
    expect(sagaEvents.publishCompensate).not.toHaveBeenCalled();
  });

  it('should accept action starting with payment.', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 456,
          status: 'approved',
          external_reference: '20',
        }),
    });
    await useCase.execute({ action: 'payment.created', data: { id: '456' } });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.mercadopago.com/v1/payments/456',
      expect.any(Object),
    );
    expect(paymentApprovedQueue.publish).toHaveBeenCalledWith(
      expect.objectContaining({ workOrderId: 20, paymentId: '456' }),
    );
  });

  it('should not publish when data.id is missing', async () => {
    global.fetch = jest.fn();
    await useCase.execute({ type: 'payment' });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(paymentApprovedQueue.publish).not.toHaveBeenCalled();
    expect(sagaEvents.publishCompensate).not.toHaveBeenCalled();
  });

  it('should not publish when MERCADOPAGO_ACCESS_TOKEN is not set', async () => {
    envConfig.get.mockReturnValue('');
    global.fetch = jest.fn();
    await useCase.execute({ type: 'payment', data: { id: '123' } });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(paymentApprovedQueue.publish).not.toHaveBeenCalled();
    expect(sagaEvents.publishCompensate).not.toHaveBeenCalled();
  });

  it('should not publish when fetch returns not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    await useCase.execute({ type: 'payment', data: { id: '123' } });
    expect(paymentApprovedQueue.publish).not.toHaveBeenCalled();
    expect(sagaEvents.publishCompensate).not.toHaveBeenCalled();
  });

  it('should not publish when payment has no external_reference', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 123,
          status: 'approved',
          external_reference: null,
        }),
    });
    await useCase.execute({ type: 'payment', data: { id: '123' } });
    expect(paymentApprovedQueue.publish).not.toHaveBeenCalled();
    expect(sagaEvents.publishCompensate).not.toHaveBeenCalled();
  });

  it('should not publish when external_reference is invalid number', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 123,
          status: 'approved',
          external_reference: 'not-a-number',
        }),
    });
    await useCase.execute({ type: 'payment', data: { id: '123' } });
    expect(paymentApprovedQueue.publish).not.toHaveBeenCalled();
    expect(sagaEvents.publishCompensate).not.toHaveBeenCalled();
  });

  it('should rethrow when publish throws', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 123,
          status: 'approved',
          external_reference: '10',
        }),
    });
    paymentApprovedQueue.publish.mockRejectedValue(new Error('Queue error'));
    await expect(
      useCase.execute({ type: 'payment', data: { id: '123' } }),
    ).rejects.toThrow('Queue error');
    expect(sagaEvents.publishCompensate).not.toHaveBeenCalled();
  });
});
