import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WebhookMercadoPagoDataDto {
  @ApiProperty({
    description:
      'ID do pagamento no Mercado Pago (obrigatório para type=payment)',
    example: '123456789',
  })
  @IsString()
  id!: string;
}

export class WebhookMercadoPagoDto {
  @ApiPropertyOptional({
    description: 'Tipo do evento. Use "payment" para notificação de pagamento.',
    example: 'payment',
    enum: [
      'payment',
      'payment_refund',
      'subscription_preapproval',
      'subscription_authorized_payment',
    ],
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Action (alternativa ao type em algumas notificações do MP)',
    example: 'payment.created',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description:
      'Objeto com id do recurso. Para type=payment, envie data.id com o ID do pagamento.',
    example: { id: '123456789' },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WebhookMercadoPagoDataDto)
  data?: WebhookMercadoPagoDataDto;
}
