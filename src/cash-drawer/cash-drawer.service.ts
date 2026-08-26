import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCashDrawerTransactionDto } from './dto/create-transaction.dto';
import { TransactionType } from '@prisma/client';

@Injectable()
export class CashDrawerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, employeeId: string, role: string, dto: CreateCashDrawerTransactionDto) {
    if (dto.type === TransactionType.SALE) {
      throw new BadRequestException('SALE transactions are automatically created via Invoices and cannot be created manually here.');
    }

    if (dto.type === TransactionType.WITHDRAWAL && role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can log a withdrawal transaction.');
    }

    let actualEmployeeId = employeeId;
    if (role === 'ADMIN' && !employeeId) {
      let adminEmp = await this.prisma.employee.findFirst({
        where: { storeId, role: 'ADMIN' }
      });
      if (!adminEmp) {
        adminEmp = await this.prisma.employee.create({
          data: {
            storeId,
            name: 'Store Owner',
            phone: '0000000000',
            pin: '0000',
            role: 'ADMIN',
            isActive: true,
          }
        });
      }
      actualEmployeeId = adminEmp.id;
    } else if (!actualEmployeeId) {
        throw new ForbiddenException('Employee ID is required');
    }

    return this.prisma.cashDrawerTransaction.create({
      data: {
        storeId,
        employeeId: actualEmployeeId,
        type: dto.type,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        description: dto.description,
      },
    });
  }

  async findAll(storeId: string, from?: string, to?: string, type?: TransactionType) {
    const where: any = { storeId };

    if (type) where.type = type;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    return this.prisma.cashDrawerTransaction.findMany({
      where,
      include: {
        employee: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSummary(storeId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1);

    const transactions = await this.prisma.cashDrawerTransaction.findMany({
      where: {
        storeId,
        createdAt: {
          gte: targetDate,
          lt: endDate,
        },
      },
    });

    let totalSales = 0;
    let totalMaintenance = 0;
    let totalExpenses = 0;
    let totalWithdrawals = 0;
    let netCashInDrawer = 0;

    for (const t of transactions) {
      const amount = Number(t.amount);
      if (t.type === TransactionType.SALE) totalSales += amount;
      else if (t.type === TransactionType.MAINTENANCE) totalMaintenance += amount;
      else if (t.type === TransactionType.EXPENSE) totalExpenses += amount;
      else if (t.type === TransactionType.WITHDRAWAL) totalWithdrawals += amount;

      if (t.paymentMethod === 'CASH') {
        if (t.type === TransactionType.SALE) netCashInDrawer += amount;
        else netCashInDrawer -= amount;
      }
    }

    return {
      totalSales,
      totalMaintenance,
      totalExpenses,
      totalWithdrawals,
      netCashInDrawer,
      transactionCount: transactions.length,
    };
  }
}
