import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
      where: { storeId, createdAt: { gte: start, lte: end } }
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
      where: { storeId, createdAt: { gte: start, lte: end } }
    });
    let cdNet = 0;
    for (const tx of cdTx) {
      const amt = Number(tx.amount);
      if (tx.type === 'SALE') cdNet += amt;
      else cdNet -= amt;
    }

    // 3. paymentChannelsTotalBalance
    const channels = await this.prisma.paymentChannel.findMany({
      where: { storeId, isActive: true }
    });
    const channelsTotal = channels.reduce((sum, ch) => sum + Number(ch.balance), 0);

    // 4. todayExpenses
    const expenses = await this.prisma.expense.findMany({
      where: { storeId, createdAt: { gte: start, lte: end } }
    });
    const expTotal = expenses.reduce((sum, ex) => sum + Number(ex.amount), 0);

    // 5. attendanceToday
    const allActive = await this.prisma.employee.count({ where: { storeId, isActive: true } });
    
    const checkIns = await this.prisma.attendanceLog.findMany({
      where: { storeId, type: 'CHECK_IN', timestamp: { gte: start, lte: end } }
    });
    const present = checkIns.length;
    const late = checkIns.filter(l => l.status === 'LATE').length;
    
    // 6. totalDebtOutstanding
    const customers = await this.prisma.customer.findMany({
      where: { storeId }
    });
    const totalDebt = customers.reduce((sum, c) => sum + Number(c.totalDebt), 0);

    return {
      todaySales: {
        totalAmount: todaySalesAmount,
        count: todayInvoices.length
      },
      cashDrawerNet: cdNet,
      paymentChannelsTotalBalance: channelsTotal,
      todayExpenses: expTotal,
      electronicSalesTotal,
      attendanceToday: {
        present,
        absent: Math.max(0, allActive - present),
        late,
        totalEmployees: allActive
      },
      totalDebtOutstanding: totalDebt
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
        createdAt: { gte: fromDate, lte: toDate }
      },
      select: { totalAmount: true, createdAt: true }
    });

    const grouped: Record<string, number> = {};
    for (const inv of invoices) {
      const day = inv.createdAt.toISOString().split('T')[0];
      if (!grouped[day]) grouped[day] = 0;
      grouped[day] += Number(inv.totalAmount);
    }
    
    return Object.keys(grouped).sort().map(date => ({
      date,
      totalAmount: grouped[date]
    }));
  }

  async getTopProducts(storeId: string, from?: string, to?: string, limit: number = 10) {
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
      include: { product: { select: { name: true } } }
    });

    const productMap: Record<string, any> = {};
    for (const item of items) {
      const pid = item.productId;
      if (!pid) continue; // skip custom items without a product
      const productName = item.product?.name ?? item.productName ?? 'منتج';
      if (!productMap[pid]) {
        productMap[pid] = { name: productName, totalQuantity: 0, totalRevenue: 0 };
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
      include: { createdByEmployee: { select: { name: true } } }
    });

    const empMap: Record<string, any> = {};
    for (const inv of invoices) {
      const eid = inv.createdByEmployeeId;
      if (!empMap[eid]) {
        empMap[eid] = { name: inv.createdByEmployee.name, totalInvoicesCreated: 0, totalSalesAmount: 0 };
      }
      empMap[eid].totalInvoicesCreated++;
      empMap[eid].totalSalesAmount += Number(inv.paidAmount);
    }

    return Object.values(empMap);
  }
}
