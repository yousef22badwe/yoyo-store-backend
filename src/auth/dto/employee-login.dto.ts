import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmployeeLoginDto {
  @ApiProperty({ example: '+1234567890', description: 'The phone number of the employee' })
  @IsPhoneNumber('EG')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '1234', description: 'The PIN for the employee account' })
  @IsString()
  @IsNotEmpty()
  pin: string;
}
