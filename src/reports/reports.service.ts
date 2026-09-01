import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus, AttendanceType } from '@prisma/client';
import { DateTime } from 'luxon';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(storeId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    // 1. todaySales & electronicSalesTotal
    const todayInvoices = await this.prisma.invoice.findMany({
      where: { storeId, createdAt: { gte: start, lte: end } },
    });
    let todaySalesAmount = 0;
    let electronicSalesTotal = 0;
    for (const inv of todayInvoices) {
      todaySalesAmount += Number(inv.totalAmount);
      if (inv.paymentMethod === 'ELECTRONIC') {
        electronicSalesTotal += Number(inv.paidAmount);
      }
    }

    // 2. cashDrawerNet
    const cdTx = await this.prisma.cashDrawerTransaction.findMany({
      where: { storeId, createdAt: { gte: start, lte: end } },
    });
    let cdNet = 0;
    for (const tx of cdTx) {
      const amt = Number(tx.amount);
      if (tx.type === 'SALE') cdNet += amt;
      else cdNet -= amt;
    }

    // 3. paymentChannelsTotalBalance
    const channels = await this.prisma.paymentChannel.findMany({
      where: { storeId, isActive: true },
    });
    const channelsTotal = channels.reduce(
      (sum, ch) => sum + Number(ch.balance),
      0,
    );

    // 4. todayExpenses
    const expenses = await this.prisma.expense.findMany({
      where: { storeId, createdAt: { gte: start, lte: end } },
    });
    const expTotal = expenses.reduce((sum, ex) => sum + Number(ex.amount), 0);

    // 5. attendanceToday
    const allActive = await this.prisma.employee.count({
      where: { storeId, isActive: true },
    });

    const checkIns = await this.prisma.attendanceLog.findMany({
      where: { storeId, type: 'CHECK_IN', timestamp: { gte: start, lte: end } },
    });
    const present = checkIns.length;
    const late = checkIns.filter((l) => l.status === 'LATE').length;

    // 6. totalDebtOutstanding
    const customers = await this.prisma.customer.findMany({
      where: { storeId },
    });
    const totalDebt = customers.reduce(
      (sum, c) => sum + Number(c.totalDebt),
      0,
    );

    return {
      todaySales: {
        totalAmount: todaySalesAmount,
        count: todayInvoices.length,
      },
      cashDrawerNet: cdNet,
      paymentChannelsTotalBalance: channelsTotal,
      todayExpenses: expTotal,
      electronicSalesTotal,
      attendanceToday: {
        present,
        absent: Math.max(0, allActive - present),
        late,
        totalEmployees: allActive,
      },
      totalDebtOutstanding: totalDebt,
    };
  }

  async getSalesChart(storeId: string, from: string, to: string) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        storeId,
        createdAt: { gte: fromDate, lte: toDate },
      },
      select: { totalAmount: true, createdAt: true },
    });

    const grouped: Record<string, number> = {};
    for (const inv of invoices) {
      const day = inv.createdAt.toISOString().split('T')[0];
      if (!grouped[day]) grouped[day] = 0;
      grouped[day] += Number(inv.totalAmount);
    }

    return Object.keys(grouped)
      .sort()
      .map((date) => ({
        date,
        totalAmount: grouped[date],
      }));
  }

  async getTopProducts(
    storeId: string,
    from?: string,
    to?: string,
    limit: number = 10,
  ) {
    const where: any = { storeId };

    if (from || to) {
      const gte = from ? new Date(from) : undefined;
      if (gte) gte.setHours(0, 0, 0, 0);

      const lte = to ? new Date(to) : undefined;
      if (lte) lte.setHours(23, 59, 59, 999);

      if (gte || lte) {
        where.createdAt = {};
        if (gte) where.createdAt.gte = gte;
        if (lte) where.createdAt.lte = lte;
      }
    }

    const items = await this.prisma.invoiceItem.findMany({
      where: { invoice: where },
      include: { product: { select: { name: true } } },
    });

    const productMap: Record<string, any> = {};
    for (const item of items) {
      const pid = item.productId;
      if (!pid) continue; // skip custom items without a product
      const productName = item.product?.name ?? item.productName ?? 'منتج';
      if (!productMap[pid]) {
        productMap[pid] = {
          name: productName,
          totalQuantity: 0,
          totalRevenue: 0,
        };
      }
      productMap[pid].totalQuantity += item.quantity;
      productMap[pid].totalRevenue += Number(item.subtotal);
    }

    return Object.values(productMap)
      .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
      .slice(0, Number(limit));
  }

  async getEmployeePerformance(storeId: string, from?: string, to?: string) {
    const where: any = { storeId };

    if (from || to) {
      const gte = from ? new Date(from) : undefined;
      if (gte) gte.setHours(0, 0, 0, 0);

      const lte = to ? new Date(to) : undefined;
      if (lte) lte.setHours(23, 59, 59, 999);

      if (gte || lte) {
        where.createdAt = {};
        if (gte) where.createdAt.gte = gte;
        if (lte) where.createdAt.lte = lte;
      }
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { createdByEmployee: { select: { name: true } } },
    });

    const empMap: Record<string, any> = {};
    for (const inv of invoices) {
      const eid = inv.createdByEmployeeId;
      if (!empMap[eid]) {
        empMap[eid] = {
          name: inv.createdByEmployee.name,
          totalInvoicesCreated: 0,
          totalSalesAmount: 0,
        };
      }
      empMap[eid].totalInvoicesCreated++;
      empMap[eid].totalSalesAmount += Number(inv.paidAmount);
    }

    return Object.values(empMap);
  }

  async getEmployeeAttendanceReport(storeId: string, from: string, to: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { timezone: true },
    });
    const timezone = store?.timezone || 'Africa/Cairo';
    const requestedStart = DateTime.fromISO(from, { zone: timezone }).startOf(
      'day',
    );
    const requestedEnd = DateTime.fromISO(to, { zone: timezone }).startOf(
      'day',
    );
    if (!requestedStart.isValid || !requestedEnd.isValid) {
      throw new BadRequestException('Invalid report date range');
    }
    if (requestedEnd < requestedStart) {
      throw new BadRequestException('Report end date must be after start date');
    }
    const requestedDays =
      Math.floor(requestedEnd.diff(requestedStart, 'days').days) + 1;
    if (requestedDays > 366) {
      throw new BadRequestException('Report range cannot exceed 366 days');
    }

    const today = DateTime.now().setZone(timezone).startOf('day');
    if (requestedStart > today) {
      throw new BadRequestException('Report range cannot start in the future');
    }
    const effectiveEnd = requestedEnd > today ? today : requestedEnd;
    const startUtc = requestedStart.toUTC().toJSDate();
    const endExclusiveUtc = effectiveEnd.plus({ days: 1 }).toUTC().toJSDate();

    const [employees, logs] = await Promise.all([
      this.prisma.employee.findMany({
        where: {
          storeId,
          isActive: true,
          NOT: { name: 'Store Owner', phone: '0000000000' },
        },
        select: {
          id: true,
          name: true,
          role: true,
          workDays: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.attendanceLog.findMany({
        where: {
          storeId,
          timestamp: { gte: startUtc, lt: endExclusiveUtc },
        },
        select: {
          employeeId: true,
          type: true,
          timestamp: true,
          status: true,
          delayMinutes: true,
        },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    const logsByEmployee = new Map<string, typeof logs>();
    for (const log of logs) {
      const employeeLogs = logsByEmployee.get(log.employeeId) ?? [];
      employeeLogs.push(log);
      logsByEmployee.set(log.employeeId, employeeLogs);
    }

    const summaries = employees.map((employee) => {
      const employeeLogs = logsByEmployee.get(employee.id) ?? [];
      const attendanceDates = new Set<string>();
      let lateDays = 0;
      let totalDelayMinutes = 0;
      let totalWorkMinutes = 0;
      let openShifts = 0;
      let openCheckIn: Date | null = null;

      for (const log of employeeLogs) {
        if (log.type === AttendanceType.CHECK_IN) {
          attendanceDates.add(
            DateTime.fromJSDate(log.timestamp).setZone(timezone).toISODate()!,
          );
          if (log.status === AttendanceStatus.LATE) lateDays += 1;
          totalDelayMinutes += log.delayMinutes ?? 0;
          openCheckIn = log.timestamp;
        } else if (openCheckIn) {
          totalWorkMinutes += Math.max(
            0,
            Math.floor(
              (log.timestamp.getTime() - openCheckIn.getTime()) / 60_000,
            ),
          );
          openCheckIn = null;
        }
      }
      if (openCheckIn) openShifts = 1;

      let scheduledDays = 0;
      let cursor = requestedStart;
      while (cursor <= effectiveEnd) {
        const weekday = cursor.weekday % 7;
        if (employee.workDays.includes(weekday)) scheduledDays += 1;
        cursor = cursor.plus({ days: 1 });
      }

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        role: employee.role,
        scheduledDays,
        attendanceDays: attendanceDates.size,
        absentDays: Math.max(0, scheduledDays - attendanceDates.size),
        onTimeDays: Math.max(0, attendanceDates.size - lateDays),
        lateDays,
        totalDelayMinutes,
        totalWorkMinutes,
        openShifts,
      };
    });

    return {
      from: requestedStart.toISODate(),
      to: effectiveEnd.toISODate(),
      timezone,
      employees: summaries,
      totals: summaries.reduce(
        (totals, summary) => ({
          scheduledDays: totals.scheduledDays + summary.scheduledDays,
          attendanceDays: totals.attendanceDays + summary.attendanceDays,
          absentDays: totals.absentDays + summary.absentDays,
          lateDays: totals.lateDays + summary.lateDays,
          totalDelayMinutes:
            totals.totalDelayMinutes + summary.totalDelayMinutes,
          totalWorkMinutes: totals.totalWorkMinutes + summary.totalWorkMinutes,
          openShifts: totals.openShifts + summary.openShifts,
        }),
        {
          scheduledDays: 0,
          attendanceDays: 0,
          absentDays: 0,
          lateDays: 0,
          totalDelayMinutes: 0,
          totalWorkMinutes: 0,
          openShifts: 0,
        },
      ),
    };
  }
}
