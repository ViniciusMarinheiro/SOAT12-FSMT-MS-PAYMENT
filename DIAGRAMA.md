# Fluxo da Aplicação SOAT12-FSMT-MS-PAYMENT

## Diagrama de Sequência do Processamento de Pagamentos

```mermaid
sequenceDiagram
    participant ORDER as MS-ORDER
    participant RabbitMQ as RabbitMQ
    participant Payment as Payment Service
    participant MP as Mercado Pago API

    Note over ORDER,MP: Fluxo 1: Criar Pagamento via Fila

    ORDER->>RabbitMQ: PUBLISH payment.v1.requested<br/>{workOrderId, title, quantity...}
    RabbitMQ->>Payment: Consumir mensagem
    Payment->>MP: POST /checkout/preferences
    MP-->>Payment: {id, init_point, ...}
    Payment->>RabbitMQ: EMIT payment.v1.processed<br/>{paymentId, init_point, debug}
    RabbitMQ->>ORDER: ORDER consome resultado

    Note over ORDER,MP: Fluxo 2: Webhook - Pagamento Aprovado

    MP->>Payment: POST /webhook<br/>{type: payment, data: {id}}
    Payment->>MP: GET /v1/payments/{id}
    MP-->>Payment: {status: approved, external_reference...}
    
    alt Status = Approved
        Payment->>RabbitMQ: EMIT payment.v1.approved<br/>{workOrderId, paymentId, debug}
        RabbitMQ->>ORDER: ORDER consome aprovação
    else Status ≠ Approved
        Payment->>Payment: Log e ignora
    end

    Payment-->>MP: HTTP 200 {status: ok}
```

## Estrutura das Filas RabbitMQ

```mermaid
graph LR
    A["payment.v1<br/>(Exchange)"] -->|"pattern: payment.requested"| B["payment.v1.requested<br/>(Queue)"]
    A -->|"pattern: payment.processed"| C["payment.v1.processed<br/>(Queue)"]
    A -->|"pattern: payment.approved"| D["payment.v1.approved<br/>(Queue)"]
    
    E["payment.v1.dlq<br/>(Dead Letter Exchange)"] -->|"DLQ"| F["payment.v1.requested.dlq"]
    E -->|"DLQ"| G["payment.v1.processed.dlq"]
    E -->|"DLQ"| H["payment.v1.approved.dlq"]
    
    classDef exchange fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef queue fill:#7AC943,stroke:#4A7C2C,color:#fff
    classDef dlq fill:#E74C3C,stroke:#C0392B,color:#fff
    
    class A exchange
    class B,C,D queue
    class E exchange
    class F,G,H dlq
```

## Payload das Filas

### payment.v1.requested (Entrada - consumida de ORDER)
```json
{
  "workOrderId": 12345,
  "title": "Troca de filtro de ar",
  "quantity": 2,
  "unitPrice": 149.9,
  "currencyId": "BRL",
  "payerEmail": "cliente@exemplo.com"
}
```

### payment.v1.processed (Saída - enviada após criar preferência)
```json
{
  "workOrderId": 12345,
  "paymentId": "203445-21c9c2ab-5209-425b-8787-8259ac4cbe6e",
  "status": "created",
  "init_point": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
  "debug": {
    "id": "203445-21c9c2ab-5209-425b-8787-8259ac4cbe6e",
    "items": [...],
    "external_reference": "12345",
    "payer": {...},
    ...
  }
}
```

### payment.v1.approved (Saída - enviada após webhook de pagamento aprovado)
```json
{
  "workOrderId": 12345,
  "paymentId": "987654321",
  "status": "approved",
  "fullPayload": {
    "webhook": { "type": "payment", "data": { "id": "987654321" } },
    "payment": { "id": 987654321, "status": "approved", "external_reference": "12345", ... }
  },
  "debug": {
    "webhook": { "type": "payment", "data": { "id": "987654321" } },
    "payment": { "id": 987654321, "status": "approved", ... }
  }
}
```

## Componentes Principais

```mermaid
graph TD
    A["HTTP Controller<br/>PaymentController"] -->|"POST /payments"| B["CreatePaymentUseCase"]
    A -->|"POST /webhook"| C["HandlePaymentWebhookUseCase"]
    
    B -->|"fetch"| D["Mercado Pago API<br/>/checkout/preferences"]
    B -->|"emit"| E["PaymentProcessedQueueProvider"]
    
    C -->|"fetch"| F["Mercado Pago API<br/>/v1/payments/{id}"]
    C -->|"emit"| G["PaymentApprovedQueueProvider"]
    
    H["RabbitMQPaymentController"] -->|"@EventPattern"| I["payment.v1.requested"]
    H -->|"execute"| B
    H -->|"emit"| E
    
    E -->|"publish"| J["RabbitMQ<br/>payment.v1.processed"]
    G -->|"publish"| K["RabbitMQ<br/>payment.v1.approved"]
    
    classDef controller fill:#FF6B6B,stroke:#C92A2A,color:#fff
    classDef usecase fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef external fill:#FFD43B,stroke:#F0AD4E,color:#000
    classDef queue fill:#7AC943,stroke:#4A7C2C,color:#fff
    
    class A,H controller
    class B,C usecase
    class D,F external
    class J,K queue
```

## Fluxo de Retry e DLQ

```mermaid
graph TD
    A["Requisição<br/>payment.v1.requested"] -->|"Tentativa 1-3"| B{Sucesso?}
    B -->|"Sim"| C["ACK mensagem<br/>Publica em<br/>payment.v1.processed"]
    C --> D["Fim"]
    
    B -->|"Não"| E["Retry com delay<br/>RABBITMQ_CONSUMER_RETRY_DELAY_MS"]
    E --> F{Tentativas<br/>restantes?}
    F -->|"Sim"| B
    F -->|"Não"| G["NACK com<br/>requeue=false"]
    
    G -->|"x-dead-letter-exchange"| H["payment.v1.dlq<br/>(Dead Letter Queue)"]
    H --> I["payment.v1.requested.dlq"]
    I --> J["Fim<br/>(falho)"]
    
    classDef success fill:#7AC943,stroke:#4A7C2C,color:#fff
    classDef retry fill:#FFD43B,stroke:#F0AD4E,color:#000
    classDef failed fill:#E74C3C,stroke:#C0392B,color:#fff
    
    class C,D success
    class E,F retry
    class G,H,I,J failed
```

## Configurações Importantes

| Variável | Valor Padrão | Descrição |
|----------|-------------|-----------|
| `RABBITMQ_URL` | - | URL de conexão ao RabbitMQ |
| `RABBITMQ_CONSUMER_MAX_RETRIES` | 3 | Máximo de tentativas ao processar mensagem |
| `RABBITMQ_CONSUMER_RETRY_DELAY_MS` | 1000 | Delay entre tentativas (ms) |
| `MERCADOPAGO_ACCESS_TOKEN` | - | Token de autenticação Mercado Pago |
| `DLQ_REPUBLISH_TO_MAIN` | false | Republicar mensagens de DLQ para fila principal |
