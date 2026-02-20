import { Test, TestingModule } from "@nestjs/testing";
import { HandlePaymentWebhookUseCase } from "../application/use-cases/handle-payment-webhook.use-case";
import { EnvConfigService } from "@/common/service/env/env-config.service";
import { PaymentApprovedQueueProvider } from "@/providers/rabbitmq/providers/payment-approved-queue.provider";

describe("HandlePaymentWebhookUseCase", () => {
  let useCase: HandlePaymentWebhookUseCase;
  let envConfig: jest.Mocked<EnvConfigService>;
  let paymentApprovedQueue: jest.Mocked<PaymentApprovedQueueProvider>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandlePaymentWebhookUseCase,
        {
          provide: EnvConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("TEST_TOKEN"),
          },
        },
        {
          provide: PaymentApprovedQueueProvider,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(HandlePaymentWebhookUseCase);
    envConfig = module.get(EnvConfigService) as jest.Mocked<EnvConfigService>;
    paymentApprovedQueue = module.get(
      PaymentApprovedQueueProvider,
    ) as jest.Mocked<PaymentApprovedQueueProvider>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock | undefined)?.mockClear?.();
  });

  it("should be defined", () => {
    expect(useCase).toBeDefined();
  });

  it("should ignore webhook when type is not payment", async () => {
    global.fetch = jest.fn();

    await useCase.execute({ type: "merchant_order", data: { id: "123" } });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(paymentApprovedQueue.publish).not.toHaveBeenCalled();
  });

  it("should publish approved payment", async () => {
    const webhookPayload = { type: "payment", data: { id: "123" } };
    const paymentResponse = {
      id: 123,
      status: "approved",
      external_reference: "10",
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(paymentResponse),
    });

    await useCase.execute(webhookPayload);

    expect(envConfig.get).toHaveBeenCalledWith("MERCADOPAGO_ACCESS_TOKEN");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.mercadopago.com/v1/payments/123",
      {
        headers: { Authorization: "Bearer TEST_TOKEN" },
      },
    );
    expect(paymentApprovedQueue.publish).toHaveBeenCalledWith({
      workOrderId: 10,
      paymentId: "123",
      status: "approved",
      fullPayload: {
        webhook: webhookPayload,
        payment: paymentResponse,
      },
    });
  });

  it("should not publish when payment is not approved", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 123,
          status: "pending",
          external_reference: "10",
        }),
    });

    await useCase.execute({ type: "payment", data: { id: "123" } });

    expect(paymentApprovedQueue.publish).not.toHaveBeenCalled();
  });
});
