import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: 'The amount paid towards the debt', example: 50.0 })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amountPaid: number;

  @ApiPropertyOptional({ description: 'Optional notes regarding this payment', example: 'Paid via bank transfer' })
  @IsString()
  @IsOptional()
  notes?: string;
}
