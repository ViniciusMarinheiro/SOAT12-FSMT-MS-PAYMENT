import { RabbitMQSetupService } from "./rabbitmq.setup.service";
import { EnvConfigService } from "@/common/service/env/env-config.service";
import * as amqp from "amqplib";

jest.mock("amqplib", () => ({
  connect: jest.fn(),
}));

describe("RabbitMQSetupService", () => {
  let service: RabbitMQSetupService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RabbitMQSetupService({} as EnvConfigService);
  });

  it("should create exchanges and queues and close resources", async () => {
    const channelMock = {
      assertExchange: jest.fn().mockResolvedValue(undefined),
      assertQueue: jest.fn().mockResolvedValue(undefined),
      bindQueue: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const connectionMock = {
      createChannel: jest.fn().mockResolvedValue(channelMock),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (amqp.connect as jest.Mock).mockResolvedValue(connectionMock);

    await service.createExchangesAndQueues("amqp://localhost:5672");

    expect(amqp.connect).toHaveBeenCalledWith("amqp://localhost:5672");
    expect(connectionMock.createChannel).toHaveBeenCalled();
    expect(channelMock.assertExchange).toHaveBeenCalled();
    expect(channelMock.assertQueue).toHaveBeenCalled();
    expect(channelMock.bindQueue).toHaveBeenCalled();
    expect(channelMock.close).toHaveBeenCalled();
    expect(connectionMock.close).toHaveBeenCalled();
  });

  it("should close connection when channel creation fails", async () => {
    const connectionMock = {
      createChannel: jest.fn().mockRejectedValue(new Error("channel error")),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (amqp.connect as jest.Mock).mockResolvedValue(connectionMock);

    await expect(
      service.createExchangesAndQueues("amqp://localhost:5672"),
    ).rejects.toThrow("channel error");

    expect(connectionMock.close).toHaveBeenCalled();
  });
});
