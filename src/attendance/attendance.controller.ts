import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  ForbiddenException,
  Param,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AttendanceStatus } from '@prisma/client';
import { KioskAttendanceDto } from './dto/kiosk-attendance.dto';
import { ManualAttendanceDto } from './dto/manual-attendance.dto';
import type { Response } from 'express';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @ApiOperation({ summary: 'Record attendance from the in-store PIN kiosk' })
  @Post('kiosk')
  recordFromKiosk(@CurrentUser() user: any, @Body() dto: KioskAttendanceDto) {
    return this.attendanceService.recordFromKiosk(user.storeId, dto);
  }

  @ApiOperation({ summary: 'Record attendance manually (Admin only)' })
  @Roles('ADMIN')
  @Post('manual')
  recordManual(@CurrentUser() user: any, @Body() dto: ManualAttendanceDto) {
    return this.attendanceService.recordManual(user.storeId, dto);
  }

  @ApiOperation({ summary: 'Check in (Employee only)' })
  @Roles('EMPLOYEE')
  @Post('check-in')
  checkIn(@CurrentUser() user: any, @Body() dto: CreateAttendanceDto) {
    if (!user.employeeId)
      throw new ForbiddenException('Only valid employees can check in');
    return this.attendanceService.checkIn(user.storeId, user.employeeId, dto);
  }

  @ApiOperation({ summary: 'Check out (Employee only)' })
  @Roles('EMPLOYEE')
  @Post('check-out')
  checkOut(@CurrentUser() user: any, @Body() dto: CreateAttendanceDto) {
    if (!user.employeeId)
      throw new ForbiddenException('Only valid employees can check out');
    return this.attendanceService.checkOut(user.storeId, user.employeeId, dto);
  }

  @ApiOperation({ summary: 'Get my own attendance history (Employee only)' })
  @Roles('EMPLOYEE')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @Get('my-history')
  findMyHistory(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!user.employeeId)
      throw new ForbiddenException(
        'Only valid employees can view their history',
      );
    return this.attendanceService.findMyHistory(
      user.storeId,
      user.employeeId,
      from,
      to,
    );
  }

  @ApiOperation({ summary: 'Get a protected attendance selfie' })
  @Get(':attendanceId/selfie')
  async getSelfie(
    @CurrentUser() user: any,
    @Param('attendanceId') attendanceId: string,
    @Res() response: Response,
  ) {
    const selfie = await this.attendanceService.getSelfie(
      user.storeId,
      attendanceId,
    );
    response.setHeader('Content-Type', selfie.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.send(selfie.data);
  }

  @ApiOperation({ summary: 'Get all store attendance records (Admin only)' })
  @Roles('ADMIN')
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'status', enum: AttendanceStatus, required: false })
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: AttendanceStatus,
  ) {
    return this.attendanceService.findAll(
      user.storeId,
      employeeId,
      from,
      to,
      status,
    );
  }
}
