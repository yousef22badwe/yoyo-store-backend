import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        storeId,
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
      },
    });
  }

  async findAll(storeId: string, from?: string, to?: string, category?: string) {
    const where: any = { storeId };

    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    return this.prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSummary(storeId: string, from?: string, to?: string) {
    const where: any = { storeId };

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const expenses = await this.prisma.expense.findMany({
      where,
    });

    const summary: Record<string, number> = {};
    for (const exp of expenses) {
      const amount = Number(exp.amount);
      if (!summary[exp.category]) {
        summary[exp.category] = 0;
      }
      summary[exp.category] += amount;
    }

    return summary;
  }
}
