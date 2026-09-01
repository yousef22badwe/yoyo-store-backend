import {
  IsOptional,
  IsString,
  IsEnum,
  Matches,
  IsPhoneNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from './create-employee.dto';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    description: 'The name of the employee',
    example: 'Jane Smith',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'The phone number of the employee',
    example: '+1987654321',
  })
  @IsPhoneNumber('EG')
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'The new 4-6 digit PIN for the employee',
    example: '5678',
    minLength: 4,
    maxLength: 6,
  })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'pin must contain 4 to 6 digits' })
  @IsOptional()
  pin?: string;

  @ApiPropertyOptional({
    description: 'The role of the employee',
    enum: Role,
    example: Role.ADMIN,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({
    description: 'Whether the employee is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Shift start as minutes after local midnight',
    example: 540,
    minimum: 0,
    maximum: 1439,
  })
  @IsInt()
  @Min(0)
  @Max(1439)
  @IsOptional()
  shiftStartMinutes?: number;

  @ApiPropertyOptional({
    description: 'Allowed grace period before attendance is marked late',
    example: 10,
    minimum: 0,
    maximum: 120,
  })
  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  graceMinutes?: number;

  @ApiPropertyOptional({
    description: 'Working weekdays where 0 is Sunday and 6 is Saturday',
    example: [0, 1, 2, 3, 4],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @IsOptional()
  workDays?: number[];
}
