import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { EnvConfigService } from '@/common/service/env/env-config.service';
import { PaymentProcessedQueueProvider } from './payment-processed-queue.provider';
import { rabbitMQConfig } from '../rabbitmq.config';

describe('PaymentProcessedQueueProvider', () => {
  let provider: PaymentProcessedQueueProvider;
  const clientMock = { emit: jest.fn() };
  const envConfigMock = { get: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentProcessedQueueProvider,
        {
          provide: rabbitMQConfig.paymentProcessed.routingKey,
          useValue: clientMock,
        },
        { provide: EnvConfigService, useValue: envConfigMock },
      ],
    }).compile();

    provider = module.get(PaymentProcessedQueueProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should not publish when RABBITMQ_URL is missing', async () => {
    envConfigMock.get.mockReturnValue('');

    await provider.publish({
      workOrderId: 1,
      paymentId: 'p1',
      status: 'created',
      init_point: 'https://link.com',
      payerEmail: 'a@b.com',
    });

    expect(clientMock.emit).not.toHaveBeenCalled();
  });

  it('should publish payment.processed message', async () => {
    envConfigMock.get.mockReturnValue('amqp://localhost');
    clientMock.emit.mockReturnValue(of(undefined));

    await provider.publish({
      workOrderId: 1,
      paymentId: 'pref-123',
      status: 'created',
      init_point: 'https://pay.com',
      payerEmail: 'user@test.com',
    });

    expect(clientMock.emit).toHaveBeenCalledWith(
      rabbitMQConfig.paymentProcessed.routingKey,
      {
        workOrderId: 1,
        paymentId: 'pref-123',
        status: 'created',
        init_point: 'https://pay.com',
        payerEmail: 'user@test.com',
      },
    );
  });
});
