import { IsEnum, IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentChannelType } from '@prisma/client';

export class CreatePaymentChannelDto {
  @ApiProperty({ description: 'The name of the payment channel', example: 'Vodafone Cash' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The type of the payment channel', enum: PaymentChannelType })
  @IsEnum(PaymentChannelType)
  @IsNotEmpty()
  type: PaymentChannelType;
}

export class UpdatePaymentChannelDto {
  @ApiPropertyOptional({ description: 'The updated name of the payment channel' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Whether the channel is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
