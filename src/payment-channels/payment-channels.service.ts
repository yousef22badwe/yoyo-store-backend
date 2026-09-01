import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePaymentChannelDto,
  UpdatePaymentChannelDto,
} from './dto/create-payment-channel.dto';
import { CreateChannelTransactionDto } from './dto/create-channel-transaction.dto';
import {
  PaymentChannelTxType,
  PaymentChannelType,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PaymentChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  private async runSerializable<T>(
    operation: (prisma: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code !== 'P2034' || attempt === 2) throw error;
      }
    }
    throw new BadRequestException('Could not complete concurrent transaction');
  }

  private async resolveEmployeeId(
    prisma: Prisma.TransactionClient,
    storeId: string,
    employeeId?: string,
    role?: string,
  ) {
    if (employeeId) return employeeId;
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Employee ID is required');
    }

    let adminEmp = await prisma.employee.findFirst({
      where: { storeId, name: 'Store Owner', phone: '0000000000' },
    });
    if (!adminEmp) {
      adminEmp = await prisma.employee.create({
        data: {
          storeId,
          name: 'Store Owner',
          phone: '0000000000',
          pin: await bcrypt.hash(`disabled-owner-${storeId}`, 10),
          role: 'ADMIN',
          isActive: false,
        },
      });
    }
    return adminEmp.id;
  }

  async create(
    storeId: string,
    employeeId: string | undefined,
    role: string,
    dto: CreatePaymentChannelDto,
  ) {
    const name = dto.name.trim();
    return this.runSerializable(async (prisma) => {
      const duplicate = await prisma.paymentChannel.findFirst({
        where: {
          storeId,
          name: { equals: name, mode: 'insensitive' },
          isActive: true,
        },
      });
      if (duplicate) {
        throw new ConflictException('A payment channel with this name exists');
      }
      const channel = await prisma.paymentChannel.create({
        data: { storeId, name, type: dto.type },
      });
      if (!dto.initialBalance) return channel;

      const actualEmployeeId = await this.resolveEmployeeId(
        prisma,
        storeId,
        employeeId,
        role,
      );
      await prisma.paymentChannelTransaction.create({
        data: {
          storeId,
          paymentChannelId: channel.id,
          employeeId: actualEmployeeId,
          type: PaymentChannelTxType.DEPOSIT,
          amount: dto.initialBalance,
          description: 'Opening balance',
        },
      });
      return prisma.paymentChannel.update({
        where: { id: channel.id },
        data: { balance: dto.initialBalance },
      });
    });
  }

  async ensureDefaults(storeId: string) {
    const defaults = [
      { name: 'ماكينة فوري', type: PaymentChannelType.POS_MACHINE },
      { name: 'فودافون كاش', type: PaymentChannelType.WALLET },
      { name: 'إنستاباي', type: PaymentChannelType.BANK_ACCOUNT },
      { name: 'ماكينة أمان', type: PaymentChannelType.POS_MACHINE },
    ];

    return this.runSerializable(async (prisma) => {
      const existing = await prisma.paymentChannel.findMany({
        where: { storeId },
      });
      for (const item of defaults) {
        const match = existing.find((channel) => channel.name === item.name);
        if (!match) {
          await prisma.paymentChannel.create({ data: { storeId, ...item } });
        } else if (!match.isActive) {
          await prisma.paymentChannel.update({
            where: { id: match.id },
            data: { isActive: true },
          });
        }
      }
      return prisma.paymentChannel.findMany({
        where: { storeId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    });
  }

  async findAll(storeId: string) {
    return this.prisma.paymentChannel.findMany({
      where: { storeId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(storeId: string, id: string, dto: UpdatePaymentChannelDto) {
    const channel = await this.prisma.paymentChannel.findFirst({
      where: { id, storeId },
    });
    if (!channel) throw new NotFoundException('Payment channel not found');

    return this.prisma.paymentChannel.update({
      where: { id },
      data: dto,
    });
  }

  async createTransaction(
    storeId: string,
    channelId: string,
    employeeId: string | undefined,
    role: string,
    dto: CreateChannelTransactionDto,
  ) {
    if (role !== 'ADMIN' && dto.type !== PaymentChannelTxType.SERVICE) {
      throw new ForbiddenException(
        'Only store admins can adjust payment channel balances',
      );
    }
    return this.runSerializable(async (prisma) => {
      const channel = await prisma.paymentChannel.findFirst({
        where: { id: channelId, storeId },
      });
      if (!channel) throw new NotFoundException('Payment channel not found');
      if (!channel.isActive)
        throw new BadRequestException('Payment channel is inactive');

      const actualEmployeeId = await this.resolveEmployeeId(
        prisma,
        storeId,
        employeeId,
        role,
      );

      let newBalance = new Prisma.Decimal(channel.balance);
      const amount = new Prisma.Decimal(dto.amount);

      if (dto.type === PaymentChannelTxType.DEPOSIT) {
        newBalance = newBalance.plus(amount);
      } else {
        if (amount.greaterThan(newBalance)) {
          throw new BadRequestException(
            'Insufficient balance in payment channel',
          );
        }
        newBalance = newBalance.minus(amount);
      }

      const transaction = await prisma.paymentChannelTransaction.create({
        data: {
          storeId,
          paymentChannelId: channel.id,
          employeeId: actualEmployeeId,
          type: dto.type,
          amount: dto.amount,
          description: dto.description,
        },
      });

      const updatedChannel = await prisma.paymentChannel.update({
        where: { id: channel.id },
        data: { balance: newBalance },
      });

      return { transaction, channelBalance: updatedChannel.balance };
    });
  }

  async getAllTransactions(
    storeId: string,
    from?: string,
    to?: string,
    type?: PaymentChannelTxType,
  ) {
    const where: Prisma.PaymentChannelTransactionWhereInput = { storeId };
    if (type) where.type = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    return this.prisma.paymentChannelTransaction.findMany({
      where,
      include: {
        paymentChannel: { select: { id: true, name: true, type: true } },
        employee: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransactions(
    storeId: string,
    channelId: string,
    from?: string,
    to?: string,
    type?: PaymentChannelTxType,
  ) {
    const channel = await this.prisma.paymentChannel.findFirst({
      where: { id: channelId, storeId },
    });
    if (!channel) throw new NotFoundException('Payment channel not found');

    const where: Prisma.PaymentChannelTransactionWhereInput = {
      storeId,
      paymentChannelId: channelId,
    };

    if (type) where.type = type;
    if (from || to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (from) createdAt.gte = new Date(from);
      if (to) createdAt.lte = new Date(to);
      where.createdAt = createdAt;
    }

    return this.prisma.paymentChannelTransaction.findMany({
      where,
      include: {
        employee: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
