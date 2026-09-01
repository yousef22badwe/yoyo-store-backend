import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AttendanceType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AttendanceService } from './attendance.service';

describe('AttendanceService kiosk', () => {
  const selfieUrl = `data:image/jpeg;base64,${Buffer.from('fake-image').toString('base64')}`;
  const scheduledEmployee = {
    id: '11111111-1111-4111-8111-111111111111',
    shiftStartMinutes: 540,
    graceMinutes: 10,
    store: { timezone: 'Africa/Cairo' },
  };
  const prisma = {
    employee: { findFirst: jest.fn() },
    attendanceLog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
  let service: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AttendanceService(prisma as any);
  });

  it('records check-in only after server-side employee PIN verification', async () => {
    prisma.employee.findFirst.mockResolvedValue({
      ...scheduledEmployee,
      pin: await bcrypt.hash('1234', 4),
    });
    prisma.attendanceLog.findFirst.mockResolvedValue(null);
    prisma.attendanceLog.create.mockResolvedValue({ id: 'attendance-1' });

    await expect(
      service.recordFromKiosk('store-1', {
        employeeId: '11111111-1111-4111-8111-111111111111',
        pin: '1234',
        type: AttendanceType.CHECK_IN,
        selfieUrl,
      }),
    ).resolves.toEqual({ id: 'attendance-1' });
    expect(prisma.attendanceLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: 'store-1',
          employeeId: '11111111-1111-4111-8111-111111111111',
          type: AttendanceType.CHECK_IN,
          selfieUrl,
        }),
      }),
    );
  });

  it('rejects a wrong kiosk PIN', async () => {
    prisma.employee.findFirst.mockResolvedValue({
      ...scheduledEmployee,
      pin: await bcrypt.hash('1234', 4),
    });

    await expect(
      service.recordFromKiosk('store-1', {
        employeeId: '11111111-1111-4111-8111-111111111111',
        pin: '9999',
        type: AttendanceType.CHECK_IN,
        selfieUrl,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.attendanceLog.create).not.toHaveBeenCalled();
  });

  it('requires a selfie for kiosk attendance', async () => {
    prisma.employee.findFirst.mockResolvedValue({
      ...scheduledEmployee,
      pin: await bcrypt.hash('1234', 4),
    });

    await expect(
      service.recordFromKiosk('store-1', {
        employeeId: '11111111-1111-4111-8111-111111111111',
        pin: '1234',
        type: AttendanceType.CHECK_IN,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.attendanceLog.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid selfie payload', async () => {
    prisma.employee.findFirst.mockResolvedValue({
      ...scheduledEmployee,
      pin: await bcrypt.hash('1234', 4),
    });

    await expect(
      service.recordFromKiosk('store-1', {
        employeeId: '11111111-1111-4111-8111-111111111111',
        pin: '1234',
        type: AttendanceType.CHECK_IN,
        selfieUrl: 'not-an-image',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.attendanceLog.create).not.toHaveBeenCalled();
  });

  it('serves a stored selfie only from the requested store attendance record', async () => {
    prisma.attendanceLog.findFirst.mockResolvedValue({ selfieUrl });

    const result = await service.getSelfie('store-1', 'attendance-1');

    expect(prisma.attendanceLog.findFirst).toHaveBeenCalledWith({
      where: { id: 'attendance-1', storeId: 'store-1' },
      select: { selfieUrl: true },
    });
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.data.toString()).toBe('fake-image');
  });

  it('records a manual action only for an employee in the admin store', async () => {
    prisma.employee.findFirst.mockResolvedValue(scheduledEmployee);
    prisma.attendanceLog.findFirst.mockResolvedValue(null);
    prisma.attendanceLog.create.mockResolvedValue({ id: 'attendance-2' });

    await expect(
      service.recordManual('store-1', {
        employeeId: '11111111-1111-4111-8111-111111111111',
        type: AttendanceType.CHECK_IN,
      }),
    ).resolves.toEqual({ id: 'attendance-2' });
    expect(prisma.employee.findFirst).toHaveBeenCalledWith({
      where: {
        id: '11111111-1111-4111-8111-111111111111',
        storeId: 'store-1',
        isActive: true,
      },
      select: { id: true },
    });
  });

  it('marks a check-in after the grace period as late in the store timezone', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-31T06:25:00.000Z'));
    try {
      prisma.employee.findFirst.mockResolvedValue(scheduledEmployee);
      prisma.attendanceLog.findFirst.mockResolvedValue(null);
      prisma.attendanceLog.create.mockResolvedValue({ id: 'attendance-late' });

      await service.checkIn(
        'store-1',
        '11111111-1111-4111-8111-111111111111',
        {},
      );

      expect(prisma.attendanceLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'LATE',
            delayMinutes: 25,
          }),
        }),
      );
      expect(prisma.attendanceLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: new Date('2026-08-30T21:00:00.000Z'),
              lt: new Date('2026-08-31T21:00:00.000Z'),
            },
          }),
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects manual attendance for an employee outside the store', async () => {
    prisma.employee.findFirst.mockResolvedValue(null);

    await expect(
      service.recordManual('store-1', {
        employeeId: '22222222-2222-4222-8222-222222222222',
        type: AttendanceType.CHECK_IN,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('pairs check-in and check-out logs and returns the real work duration', async () => {
    prisma.attendanceLog.findMany.mockResolvedValue([
      {
        id: 'checkout-1',
        employeeId: 'employee-1',
        type: AttendanceType.CHECK_OUT,
        timestamp: new Date('2026-08-31T14:00:00.000Z'),
        selfieUrl,
      },
      {
        id: 'checkin-1',
        employeeId: 'employee-1',
        type: AttendanceType.CHECK_IN,
        timestamp: new Date('2026-08-31T06:00:00.000Z'),
        selfieUrl,
      },
    ]);

    const logs = await service.findAll('store-1');

    expect(logs).toEqual([
      expect.objectContaining({
        id: 'checkout-1',
        workDurationMinutes: 480,
        pairedCheckInTimestamp: new Date('2026-08-31T06:00:00.000Z'),
        selfieUrl: '/attendance/checkout-1/selfie',
        isOpenShift: false,
      }),
      expect.objectContaining({
        id: 'checkin-1',
        workDurationMinutes: 480,
        pairedCheckOutTimestamp: new Date('2026-08-31T14:00:00.000Z'),
        selfieUrl: '/attendance/checkin-1/selfie',
        isOpenShift: false,
      }),
    ]);
  });
});
