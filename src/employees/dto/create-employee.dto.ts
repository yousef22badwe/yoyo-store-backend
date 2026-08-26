import { IsNotEmpty, IsString, IsEnum, Length, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Role {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

export class CreateEmployeeDto {
  @ApiProperty({ description: 'The name of the employee', example: 'Jane Smith' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The phone number of the employee', example: '+1987654321' })
  @IsPhoneNumber('EG')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'The 4-6 digit PIN for the employee', example: '1234', minLength: 4, maxLength: 6 })
  @IsString()
  @Length(4, 6)
  @IsNotEmpty()
  pin: string;

  @ApiProperty({ description: 'The role of the employee', enum: Role, example: Role.EMPLOYEE })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
