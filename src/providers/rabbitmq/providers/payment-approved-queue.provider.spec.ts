import { Test, TestingModule } from "@nestjs/testing";
import { of } from "rxjs";
import { EnvConfigService } from "@/common/service/env/env-config.service";
import { PaymentApprovedQueueProvider } from "./payment-approved-queue.provider";
import { rabbitMQConfig } from "../rabbitmq.config";

describe("PaymentApprovedQueueProvider", () => {
  let provider: PaymentApprovedQueueProvider;
  const clientMock = {
    emit: jest.fn(),
  };
  const envConfigMock = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentApprovedQueueProvider,
        {
          provide: rabbitMQConfig.paymentApproved.routingKey,
          useValue: clientMock,
        },
        {
          provide: EnvConfigService,
          useValue: envConfigMock,
        },
      ],
    }).compile();

    provider = module.get(PaymentApprovedQueueProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should not publish when RABBITMQ_URL is missing", async () => {
    envConfigMock.get.mockReturnValue("");

    await provider.publish({
      workOrderId: 10,
      paymentId: "123",
      status: "approved",
    });

    expect(clientMock.emit).not.toHaveBeenCalled();
  });

  it("should publish payment approved message", async () => {
    envConfigMock.get.mockReturnValue("amqp://localhost");
    clientMock.emit.mockReturnValue(of(true));

    await provider.publish({
      workOrderId: 10,
      paymentId: "123",
      status: "approved",
    });

    expect(clientMock.emit).toHaveBeenCalledWith(
      rabbitMQConfig.paymentApproved.routingKey,
      {
        workOrderId: 10,
        paymentId: "123",
        status: "approved",
      },
    );
  });
});
