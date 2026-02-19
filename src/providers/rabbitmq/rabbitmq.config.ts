import { MessageConfig } from "./types/message.interface";

export interface RabbitMQConfig extends MessageConfig {
  exchangeType?: "topic" | "direct" | "fanout";
  isConsumer?: boolean;
}

export const rabbitMQConfig: Record<string, RabbitMQConfig> = {
  paymentApproved: {
    exchange: "payment.v1",
    queue: "payment.v1.approved",
    routingKey: "payment.approved",
    deadLetterExchange: "payment.v1.dlq",
    deadLetterRoutingKey: "payment.approved.dlq",
    isConsumer: false,
  },
};

export const getRabbitMQConfigs = (): RabbitMQConfig[] => {
  return Object.values(rabbitMQConfig);
};
