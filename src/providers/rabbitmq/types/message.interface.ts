export interface MessageConfig {
  queue: string;
  exchange?: string;
  routingKey: string;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
}
