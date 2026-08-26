import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { AttendanceType, AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(storeId: string, employeeId: string, dto: CreateAttendanceDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for open check-in today
    const lastLog = await this.prisma.attendanceLog.findFirst({
      where: {
        employeeId,
        storeId,
        timestamp: { gte: today },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (lastLog && lastLog.type === AttendanceType.CHECK_IN) {
      throw new BadRequestException('You already have an open check-in for today. Please check out first.');
    }

    // Assumption: Because we have no "shift" schedule module yet, 
    // we assume all employees are always ON_TIME for check-ins.
    const status = AttendanceStatus.ON_TIME;
    const delayMinutes = 0;

    return this.prisma.attendanceLog.create({
      data: {
        storeId,
        employeeId,
        type: AttendanceType.CHECK_IN,
        status,
        delayMinutes,
        selfieUrl: dto.selfieUrl,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  async checkOut(storeId: string, employeeId: string, dto: CreateAttendanceDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for open check-in today
    const lastLog = await this.prisma.attendanceLog.findFirst({
      where: {
        employeeId,
        storeId,
        timestamp: { gte: today },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!lastLog || lastLog.type === AttendanceType.CHECK_OUT) {
      throw new BadRequestException('You do not have an open check-in to check out from today.');
    }

    // Assumption: check-outs are also always ON_TIME by default
    return this.prisma.attendanceLog.create({
      data: {
        storeId,
        employeeId,
        type: AttendanceType.CHECK_OUT,
        status: AttendanceStatus.ON_TIME,
        delayMinutes: 0,
        selfieUrl: dto.selfieUrl,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  async findMyHistory(storeId: string, employeeId: string, from?: string, to?: string) {
    const where: any = { storeId, employeeId };

    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    return this.prisma.attendanceLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });
  }

  async findAll(storeId: string, employeeId?: string, from?: string, to?: string, status?: AttendanceStatus) {
    const where: any = { storeId };

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    return this.prisma.attendanceLog.findMany({
      where,
      include: {
        employee: { select: { name: true } }
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}
