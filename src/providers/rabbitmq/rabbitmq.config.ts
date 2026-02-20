import { MessageConfig } from "./types/message.interface";

export interface RabbitMQConfig extends MessageConfig {
  exchangeType?: "topic" | "direct" | "fanout";
  isConsumer?: boolean;
}

export const rabbitMQConfig: Record<string, RabbitMQConfig> = {
  // Fila para receber requisições de pagamento do ORDER
  paymentRequested: {
    exchange: "payment.v1",
    queue: "payment.v1.requested",
    routingKey: "payment.requested",
    deadLetterExchange: "payment.v1.dlq",
    deadLetterRoutingKey: "payment.requested.dlq",
    isConsumer: true,
  },
  // Fila para publicar resultado de pagamento processado (para ORDER)
  paymentProcessed: {
    exchange: "payment.v1",
    queue: "payment.v1.processed",
    routingKey: "payment.processed",
    deadLetterExchange: "payment.v1.dlq",
    deadLetterRoutingKey: "payment.processed.dlq",
    isConsumer: false,
  },
  // Fila legada para webhook do Mercado Pago (apenas publicação)
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

export const getConsumerConfigs = (): RabbitMQConfig[] => {
  return getRabbitMQConfigs().filter((c) => c.isConsumer !== false);
};
