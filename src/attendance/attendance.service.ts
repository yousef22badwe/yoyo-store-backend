import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { AttendanceType, AttendanceStatus } from '@prisma/client';
import { KioskAttendanceDto } from './dto/kiosk-attendance.dto';
import * as bcrypt from 'bcrypt';
import { ManualAttendanceDto } from './dto/manual-attendance.dto';
import { DateTime } from 'luxon';

@Injectable()
export class AttendanceService {
  private static readonly MAX_SELFIE_BYTES = 750 * 1024;

  constructor(private readonly prisma: PrismaService) {}

  async recordFromKiosk(storeId: string, dto: KioskAttendanceDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, storeId, isActive: true },
      select: { id: true, pin: true },
    });

    if (!employee || !(await bcrypt.compare(dto.pin, employee.pin))) {
      throw new UnauthorizedException('Invalid employee or PIN');
    }

    if (!dto.selfieUrl) {
      throw new BadRequestException(
        'A selfie is required for kiosk attendance',
      );
    }
    this.validateSelfie(dto.selfieUrl);

    const attendanceData: CreateAttendanceDto = {
      selfieUrl: dto.selfieUrl,
      latitude: dto.latitude,
      longitude: dto.longitude,
    };

    return dto.type === AttendanceType.CHECK_IN
      ? this.checkIn(storeId, employee.id, attendanceData)
      : this.checkOut(storeId, employee.id, attendanceData);
  }

  async recordManual(storeId: string, dto: ManualAttendanceDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, storeId, isActive: true },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found in this store');
    }
    if (dto.selfieUrl) this.validateSelfie(dto.selfieUrl);

    const attendanceData: CreateAttendanceDto = {
      selfieUrl: dto.selfieUrl,
      latitude: dto.latitude,
      longitude: dto.longitude,
    };
    return dto.type === AttendanceType.CHECK_IN
      ? this.checkIn(storeId, employee.id, attendanceData)
      : this.checkOut(storeId, employee.id, attendanceData);
  }

  async checkIn(storeId: string, employeeId: string, dto: CreateAttendanceDto) {
    const schedule = await this.getEmployeeSchedule(storeId, employeeId);
    const now = DateTime.now().setZone(schedule.timezone);
    const { start, end } = this.localDayBounds(now);

    // Check for open check-in today
    const lastLog = await this.prisma.attendanceLog.findFirst({
      where: {
        employeeId,
        storeId,
        timestamp: { gte: start, lt: end },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (lastLog && lastLog.type === AttendanceType.CHECK_IN) {
      throw new BadRequestException(
        'You already have an open check-in for today. Please check out first.',
      );
    }

    const scheduledStart = now.startOf('day').plus({
      minutes: schedule.shiftStartMinutes,
    });
    const minutesAfterStart = Math.max(
      0,
      Math.floor(now.diff(scheduledStart, 'minutes').minutes),
    );
    const status =
      minutesAfterStart > schedule.graceMinutes
        ? AttendanceStatus.LATE
        : AttendanceStatus.ON_TIME;
    const delayMinutes =
      status === AttendanceStatus.LATE ? minutesAfterStart : 0;

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

  async checkOut(
    storeId: string,
    employeeId: string,
    dto: CreateAttendanceDto,
  ) {
    const schedule = await this.getEmployeeSchedule(storeId, employeeId);
    const now = DateTime.now().setZone(schedule.timezone);
    const { start, end } = this.localDayBounds(now);

    // Check for open check-in today
    const lastLog = await this.prisma.attendanceLog.findFirst({
      where: {
        employeeId,
        storeId,
        timestamp: { gte: start, lt: end },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!lastLog || lastLog.type === AttendanceType.CHECK_OUT) {
      throw new BadRequestException(
        'You do not have an open check-in to check out from today.',
      );
    }

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

  async findMyHistory(
    storeId: string,
    employeeId: string,
    from?: string,
    to?: string,
  ) {
    const where: any = { storeId, employeeId };

    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const logs = await this.prisma.attendanceLog.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, role: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });
    return this.withAttendanceDetails(logs);
  }

  async findAll(
    storeId: string,
    employeeId?: string,
    from?: string,
    to?: string,
    status?: AttendanceStatus,
  ) {
    const where: any = { storeId };

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const logs = await this.prisma.attendanceLog.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, role: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });
    return this.withAttendanceDetails(logs);
  }

  async getSelfie(storeId: string, attendanceId: string) {
    const log = await this.prisma.attendanceLog.findFirst({
      where: { id: attendanceId, storeId },
      select: { selfieUrl: true },
    });
    if (!log?.selfieUrl) {
      throw new NotFoundException('Attendance selfie not found');
    }

    this.validateSelfie(log.selfieUrl);
    const separatorIndex = log.selfieUrl.indexOf(',');
    const mimeType = log.selfieUrl.substring(5, log.selfieUrl.indexOf(';'));
    return {
      mimeType,
      data: Buffer.from(log.selfieUrl.substring(separatorIndex + 1), 'base64'),
    };
  }

  private withProtectedSelfieUrl<
    T extends { id: string; selfieUrl?: string | null },
  >(log: T) {
    return {
      ...log,
      selfieUrl: log.selfieUrl ? `/attendance/${log.id}/selfie` : null,
    };
  }

  private withAttendanceDetails(logs: any[]) {
    const detailsByLogId = new Map<string, Record<string, unknown>>();
    const openCheckIns = new Map<string, any>();
    const orderedLogs = [...logs].sort(
      (left, right) =>
        new Date(left.timestamp).getTime() -
        new Date(right.timestamp).getTime(),
    );

    for (const log of orderedLogs) {
      if (log.type === AttendanceType.CHECK_IN) {
        openCheckIns.set(log.employeeId, log);
        continue;
      }

      const checkIn = openCheckIns.get(log.employeeId);
      if (!checkIn) continue;
      const workDurationMinutes = Math.max(
        0,
        Math.floor(
          (new Date(log.timestamp).getTime() -
            new Date(checkIn.timestamp).getTime()) /
            60_000,
        ),
      );
      detailsByLogId.set(checkIn.id, {
        workDurationMinutes,
        pairedCheckOutTimestamp: log.timestamp,
        isOpenShift: false,
      });
      detailsByLogId.set(log.id, {
        workDurationMinutes,
        pairedCheckInTimestamp: checkIn.timestamp,
        isOpenShift: false,
      });
      openCheckIns.delete(log.employeeId);
    }

    for (const checkIn of openCheckIns.values()) {
      const elapsedMinutes = Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(checkIn.timestamp).getTime()) / 60_000,
        ),
      );
      detailsByLogId.set(checkIn.id, {
        workDurationMinutes: elapsedMinutes,
        isOpenShift: true,
      });
    }

    return logs.map((log) => ({
      ...this.withProtectedSelfieUrl(log),
      ...(detailsByLogId.get(log.id) ?? {}),
    }));
  }

  private validateSelfie(selfieDataUrl: string) {
    const match = selfieDataUrl.match(
      /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/,
    );
    if (!match) {
      throw new BadRequestException('Invalid selfie image format');
    }
    const decodedSize = Buffer.byteLength(match[2], 'base64');
    if (decodedSize === 0 || decodedSize > AttendanceService.MAX_SELFIE_BYTES) {
      throw new BadRequestException('Selfie image exceeds the 750 KB limit');
    }
  }

  private async getEmployeeSchedule(storeId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, storeId, isActive: true },
      select: {
        shiftStartMinutes: true,
        graceMinutes: true,
        store: { select: { timezone: true } },
      },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found in this store');
    }
    const timezone = employee.store.timezone || 'Africa/Cairo';
    const localNow = DateTime.now().setZone(timezone);
    if (!localNow.isValid) {
      throw new BadRequestException('Store timezone is invalid');
    }
    return {
      shiftStartMinutes: employee.shiftStartMinutes,
      graceMinutes: employee.graceMinutes,
      timezone,
    };
  }

  private localDayBounds(localNow: DateTime) {
    return {
      start: localNow.startOf('day').toUTC().toJSDate(),
      end: localNow.plus({ days: 1 }).startOf('day').toUTC().toJSDate(),
    };
  }
}
