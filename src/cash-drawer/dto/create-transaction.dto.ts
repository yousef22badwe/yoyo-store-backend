import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType, PaymentMethod } from '@prisma/client';

export class CreateCashDrawerTransactionDto {
  @ApiProperty({ description: 'Type of transaction', enum: TransactionType })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiProperty({ description: 'Amount for the transaction', example: 100.5 })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Method of payment', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'Description or reason for transaction', example: 'Fixed the AC' })
  @IsString()
  @IsOptional()
  description?: string;
}
