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
  @ApiPropertyOptional({ description: 'The product ID (optional for custom items)', example: 'uuid-1234' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: 'Custom product name (used when productId is not set)', example: 'iPhone 15' })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiProperty({ description: 'Quantity sold', example: 2 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit price override (used for custom items)', example: 15000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional({ description: 'The ID of the customer. Optional - can use customerName instead', example: 'uuid-5678' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Customer name (used to create/find customer by name)', example: 'أحمد علي' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer phone', example: '01011111111' })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Total amount override (calculated from items if not provided)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalAmount?: number;

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
