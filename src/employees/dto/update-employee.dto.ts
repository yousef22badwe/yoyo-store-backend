import { IsOptional, IsString, IsEnum, Length, IsPhoneNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from './create-employee.dto';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ description: 'The name of the employee', example: 'Jane Smith' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'The phone number of the employee', example: '+1987654321' })
  @IsPhoneNumber('EG')
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'The new 4-6 digit PIN for the employee', example: '5678', minLength: 4, maxLength: 6 })
  @IsString()
  @Length(4, 6)
  @IsOptional()
  pin?: string;

  @ApiPropertyOptional({ description: 'The role of the employee', enum: Role, example: Role.ADMIN })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ description: 'Whether the employee is active', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
