import { ApiProperty } from '@nestjs/swagger';
import { AttendanceType } from '@prisma/client';
import { IsEnum, IsString, IsUUID, Matches } from 'class-validator';
import { CreateAttendanceDto } from './create-attendance.dto';

export class KioskAttendanceDto extends CreateAttendanceDto {
  @ApiProperty({ description: 'Employee ID selected on the kiosk' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ example: '1234', description: 'Employee PIN' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'pin must contain 4 to 6 digits' })
  pin: string;

  @ApiProperty({ enum: AttendanceType })
  @IsEnum(AttendanceType)
  type: AttendanceType;
}
