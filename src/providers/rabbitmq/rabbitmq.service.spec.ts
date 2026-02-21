import { Transport } from "@nestjs/microservices";
import { RabbitMQService } from "./rabbitmq.service";
import { MessageConfig } from "./types/message.interface";
import { EnvConfigService } from "@/common/service/env/env-config.service";

describe("RabbitMQService", () => {
  const baseConfig: MessageConfig = {
    queue: "payment.v1.approved",
    routingKey: "payment.approved",
    deadLetterExchange: "payment.v1.dlq",
    deadLetterRoutingKey: "payment.approved.dlq",
    exchange: "payment.v1",
  };

  it("should create options with configured RABBITMQ_URL", () => {
    const envConfig = {
      get: jest.fn().mockReturnValue("amqp://rabbitmq:5672"),
    } as unknown as EnvConfigService;

    const service = new RabbitMQService(envConfig);
    const options = service.createClientOptions(baseConfig);

    expect(options.transport).toBe(Transport.RMQ);
    expect(options.options.urls).toEqual(["amqp://rabbitmq:5672"]);
    expect(options.options.queue).toBe("payment.v1.approved");
    expect(options.options.exchange).toBe("payment.v1");
    expect(options.options.routingKey).toBe("payment.approved");
  });

  it("should fallback to localhost url when env var is missing", () => {
    const envConfig = {
      get: jest.fn().mockReturnValue(""),
    } as unknown as EnvConfigService;

    const service = new RabbitMQService(envConfig);
    const options = service.createClientOptions(baseConfig);

    expect(options.options.urls).toEqual(["amqp://localhost"]);
  });

  it("should register async client with routing key as provider name", () => {
    const dynamicModule = RabbitMQService.registerClient(baseConfig);

    expect(dynamicModule).toBeDefined();
    expect(dynamicModule.module).toBeDefined();
  });
});
