import {
  IsNotEmpty,
  IsString,
  IsEnum,
  Matches,
  IsPhoneNumber,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Role {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'The name of the employee',
    example: 'Jane Smith',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The phone number of the employee',
    example: '+1987654321',
  })
  @IsPhoneNumber('EG')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'The 4-6 digit PIN for the employee',
    example: '1234',
    minLength: 4,
    maxLength: 6,
  })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'pin must contain 4 to 6 digits' })
  @IsNotEmpty()
  pin: string;

  @ApiProperty({
    description: 'The role of the employee',
    enum: Role,
    example: Role.EMPLOYEE,
  })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @ApiProperty({
    description: 'Shift start as minutes after local midnight',
    example: 540,
    minimum: 0,
    maximum: 1439,
    default: 540,
  })
  @IsInt()
  @Min(0)
  @Max(1439)
  shiftStartMinutes: number;

  @ApiProperty({
    description: 'Allowed grace period before marking attendance as late',
    example: 10,
    minimum: 0,
    maximum: 120,
    default: 10,
  })
  @IsInt()
  @Min(0)
  @Max(120)
  graceMinutes: number;

  @ApiProperty({
    description: 'Working weekdays where 0 is Sunday and 6 is Saturday',
    example: [0, 1, 2, 3, 4],
    default: [0, 1, 2, 3, 4, 5, 6],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workDays: number[];
}
