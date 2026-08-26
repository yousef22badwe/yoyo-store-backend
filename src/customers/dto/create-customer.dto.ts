import { IsNotEmpty, IsOptional, IsString, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ description: 'The name of the customer', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The phone number of the customer', example: '+1987654321' })
  @IsPhoneNumber('EG')
  @IsNotEmpty()
  phone: string;
}
