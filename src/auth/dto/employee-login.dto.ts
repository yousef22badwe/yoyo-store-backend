import { IsNotEmpty, IsPhoneNumber, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmployeeLoginDto {
  @ApiProperty({
    example: '+1234567890',
    description: 'The phone number of the employee',
  })
  @IsPhoneNumber('EG')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: '1234',
    description: 'The PIN for the employee account',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}$/, { message: 'pin must contain 4 to 6 digits' })
  pin: string;
}
