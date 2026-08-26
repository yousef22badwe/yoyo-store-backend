import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentChannelTxType } from '@prisma/client';

export class CreateChannelTransactionDto {
  @ApiProperty({ description: 'The type of transaction', enum: PaymentChannelTxType })
  @IsEnum(PaymentChannelTxType)
  @IsNotEmpty()
  type: PaymentChannelTxType;

  @ApiProperty({ description: 'The amount to transact', example: 50.0 })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ description: 'A description or reason for the transaction', example: 'Instapay transfer for customer' })
  @IsString()
  @IsOptional()
  description?: string;
}
