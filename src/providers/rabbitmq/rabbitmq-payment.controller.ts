import { Controller, Logger } from '@nestjs/common';
import { Ctx, Payload, RmqContext, EventPattern } from '@nestjs/microservices';
import { CreatePaymentUseCase } from '@/modules/payment/application/use-cases/create-payment.use-case';
import { PaymentProcessedQueueProvider } from './providers/payment-processed-queue.provider';
import { EnvConfigService } from '@/common/service/env/env-config.service';

export interface PaymentRequestPayload {
  workOrderId: number;
  title: string;
  quantity: number;
  unitPrice: number;
  currencyId?: string;
  payerEmail?: string;
}

@Controller()
export class RabbitMQPaymentController {
  private readonly logger = new Logger(RabbitMQPaymentController.name);
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly paymentProcessedQueue: PaymentProcessedQueueProvider,
    private readonly envConfigService: EnvConfigService,
  ) {
    this.maxRetries =
      parseInt(
        this.envConfigService.get('RABBITMQ_CONSUMER_MAX_RETRIES'),
        10,
      ) || 3;
    this.retryDelayMs =
      parseInt(
        this.envConfigService.get('RABBITMQ_CONSUMER_RETRY_DELAY_MS'),
        10,
      ) || 1000;

    this.logger.log(
      'Aplicação conectada ao RabbitMQ e ouvindo a fila payment.v1.requested',
    );
  }

  @EventPattern('payment.v1.requested')
  async handlePaymentRequested(
    @Payload() data: PaymentRequestPayload,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    this.logger.debug(
      `Processando requisição de pagamento para workOrderId=${data.workOrderId}`,
    );

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Executar use case de criação de pagamento
        const paymentResult = await this.createPaymentUseCase.execute(data);

        // Publicar resultado na fila de pagamentos processados (ORDER consome e envia email com link)
        const paymentId = (paymentResult.id as string) || 'unknown';
        await this.paymentProcessedQueue.publish({
          workOrderId: data.workOrderId,
          paymentId,
          status: 'created',
          init_point: paymentResult.init_point as string,
          payerEmail: data.payerEmail,
          debug: paymentResult,
        });
        this.logger.log(
          `Pagamento criado com sucesso: paymentId=${paymentId}, workOrderId=${data.workOrderId}`,
        );

        // Fazer ACK da mensagem
        try {
          channel.ack(originalMessage);
        } catch (ackError: unknown) {
          this.logger.warn('Erro ao fazer ACK da mensagem', {
            error:
              ackError instanceof Error ? ackError.message : String(ackError),
          });
        }
        return;
      } catch (error) {
        lastError = error;
        this.logger.debug(
          `Tentativa ${attempt}/${this.maxRetries} falhou - ${(error as Error)?.message}`,
          { workOrderId: data.workOrderId, attempt },
        );

        // Publicar erro na fila de processados
        if (attempt === this.maxRetries) {
          try {
            await this.paymentProcessedQueue.publish({
              workOrderId: data.workOrderId,
              paymentId: 'failed',
              status: 'error',
              payerEmail: data.payerEmail,
              error: (error as Error)?.message || 'Erro desconhecido',
              debug: {
                attempt,
                maxRetries: this.maxRetries,
                error: (error as Error)?.stack || String(error),
              },
            });
          } catch (publishError: unknown) {
            this.logger.error('Erro ao publicar resultado de erro', {
              error:
                publishError instanceof Error
                  ? publishError.message
                  : String(publishError),
            });
          }
        }

        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelayMs);
        }
      }
    }

    this.logger.error(
      `Requisição de pagamento enviada para DLQ após ${this.maxRetries} tentativas`,
      { workOrderId: data.workOrderId, error: (lastError as Error)?.message },
    );

    try {
      channel.nack(originalMessage, false, false);
    } catch (nackError: unknown) {
      this.logger.warn('Erro ao fazer NACK da mensagem', {
        error:
          nackError instanceof Error ? nackError.message : String(nackError),
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
