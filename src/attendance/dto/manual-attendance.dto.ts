import { ApiProperty } from '@nestjs/swagger';
import { AttendanceType } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';
import { CreateAttendanceDto } from './create-attendance.dto';

export class ManualAttendanceDto extends CreateAttendanceDto {
  @ApiProperty({
    description: 'Employee ID managed by the store administrator',
  })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ enum: AttendanceType })
  @IsEnum(AttendanceType)
  type: AttendanceType;
}
