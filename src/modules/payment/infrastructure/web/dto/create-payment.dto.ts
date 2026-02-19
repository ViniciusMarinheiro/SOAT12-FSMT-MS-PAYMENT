import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEmail,
  Min,
} from "class-validator";

export class CreatePaymentDto {
  @ApiProperty({
    description: "Título do item ou pedido",
    example: "Serviço de manutenção",
  })
  @IsString()
  title!: string;

  @ApiProperty({
    description: "Quantidade",
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1, { message: "quantity deve ser maior que 0" })
  quantity!: number;

  @ApiProperty({
    description: "Preço unitário",
    example: 100.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: "unitPrice deve ser maior ou igual a 0" })
  unitPrice!: number;

  @ApiPropertyOptional({
    description: "Código da moeda (ISO 4217). Padrão: BRL",
    example: "BRL",
  })
  @IsOptional()
  @IsString()
  currencyId?: string;

  @ApiPropertyOptional({
    description: "Email do pagador",
    example: "cliente@email.com",
  })
  @IsOptional()
  @IsEmail()
  payerEmail?: string;

  @ApiPropertyOptional({
    description: "ID da ordem de serviço (vinculado ao pagamento para webhook)",
    example: 123,
  })
  @IsOptional()
  @IsNumber()
  workOrderId?: number;
}
