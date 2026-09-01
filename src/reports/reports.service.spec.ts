import { AttendanceStatus, AttendanceType } from '@prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService employee attendance', () => {
  const prisma = {
    store: { findUnique: jest.fn() },
    employee: { findMany: jest.fn() },
    attendanceLog: { findMany: jest.fn() },
  };
  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService(prisma as any);
  });

  it('calculates scheduled attendance, absence, lateness, and work hours', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-02T12:00:00.000Z'));
    try {
      prisma.store.findUnique.mockResolvedValue({ timezone: 'Africa/Cairo' });
      prisma.employee.findMany.mockResolvedValue([
        {
          id: 'employee-1',
          name: 'Ahmed',
          role: 'EMPLOYEE',
          workDays: [1, 2, 3],
        },
      ]);
      prisma.attendanceLog.findMany.mockResolvedValue([
        {
          employeeId: 'employee-1',
          type: AttendanceType.CHECK_IN,
          timestamp: new Date('2026-08-31T06:25:00.000Z'),
          status: AttendanceStatus.LATE,
          delayMinutes: 25,
        },
        {
          employeeId: 'employee-1',
          type: AttendanceType.CHECK_OUT,
          timestamp: new Date('2026-08-31T14:00:00.000Z'),
          status: AttendanceStatus.ON_TIME,
          delayMinutes: 0,
        },
        {
          employeeId: 'employee-1',
          type: AttendanceType.CHECK_IN,
          timestamp: new Date('2026-09-02T06:00:00.000Z'),
          status: AttendanceStatus.ON_TIME,
          delayMinutes: 0,
        },
      ]);

      const report = await service.getEmployeeAttendanceReport(
        'store-1',
        '2026-08-31',
        '2026-09-02',
      );

      expect(report.timezone).toBe('Africa/Cairo');
      expect(report.employees).toEqual([
        expect.objectContaining({
          employeeId: 'employee-1',
          scheduledDays: 3,
          attendanceDays: 2,
          absentDays: 1,
          onTimeDays: 1,
          lateDays: 1,
          totalDelayMinutes: 25,
          totalWorkMinutes: 455,
          openShifts: 1,
        }),
      ]);
      expect(report.totals).toEqual(
        expect.objectContaining({
          attendanceDays: 2,
          absentDays: 1,
          lateDays: 1,
          totalWorkMinutes: 455,
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
