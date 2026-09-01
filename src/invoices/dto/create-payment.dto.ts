import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from './create-invoice.dto';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'The amount paid towards the debt',
    example: 50.0,
  })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amountPaid: number;

  @ApiPropertyOptional({
    description: 'How this debt payment was received',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Configured electronic payment channel ID',
  })
  @IsUUID()
  @IsOptional()
  paymentChannelId?: string;

  @ApiPropertyOptional({
    description: 'Optional notes regarding this payment',
    example: 'Paid via bank transfer',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
