import { IsNotEmpty, IsOptional, IsString, IsUUID, IsEnum, IsNumber, Min, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InvoiceType {
  CASH = 'CASH',
  CREDIT = 'CREDIT',
}

export enum PaymentMethod {
  CASH = 'CASH',
  ELECTRONIC = 'ELECTRONIC',
}

export class InvoiceItemDto {
  @ApiProperty({ description: 'The product ID', example: 'uuid-1234' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity sold', example: 2 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional({ description: 'The ID of the customer. Required if CREDIT', example: 'uuid-5678' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ description: 'Type of invoice', enum: InvoiceType, example: InvoiceType.CASH })
  @IsEnum(InvoiceType)
  @IsNotEmpty()
  invoiceType: InvoiceType;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'ID of the payment channel (required if method is ELECTRONIC)' })
  @IsString()
  @IsOptional()
  paymentChannelId?: string;

  @ApiPropertyOptional({ description: 'Amount paid upfront (for CREDIT/PARTIAL)', example: 50.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  paidAmount?: number;

  @ApiProperty({ description: 'List of items in the invoice', type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
