import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentChannelType } from '@prisma/client';

export class CreatePaymentChannelDto {
  @ApiProperty({
    description: 'The name of the payment channel',
    example: 'Vodafone Cash',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The type of the payment channel',
    enum: PaymentChannelType,
  })
  @IsEnum(PaymentChannelType)
  @IsNotEmpty()
  type: PaymentChannelType;

  @ApiPropertyOptional({
    description: 'Opening balance. It is recorded as an audited deposit.',
    example: 1000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  initialBalance?: number;
}

export class UpdatePaymentChannelDto {
  @ApiPropertyOptional({
    description: 'The updated name of the payment channel',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Whether the channel is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
