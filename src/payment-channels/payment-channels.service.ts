import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentChannelDto, UpdatePaymentChannelDto } from './dto/create-payment-channel.dto';
import { CreateChannelTransactionDto } from './dto/create-channel-transaction.dto';
import { PaymentChannelTxType } from '@prisma/client';

@Injectable()
export class PaymentChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreatePaymentChannelDto) {
    return this.prisma.paymentChannel.create({
      data: {
        storeId,
        name: dto.name,
        type: dto.type,
      }
    });
  }

  async findAll(storeId: string) {
    return this.prisma.paymentChannel.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async update(storeId: string, id: string, dto: UpdatePaymentChannelDto) {
    const channel = await this.prisma.paymentChannel.findFirst({
      where: { id, storeId }
    });
    if (!channel) throw new NotFoundException('Payment channel not found');

    return this.prisma.paymentChannel.update({
      where: { id },
      data: dto
    });
  }

  async createTransaction(storeId: string, channelId: string, employeeId: string, role: string, dto: CreateChannelTransactionDto) {
    return this.prisma.$transaction(async (prisma) => {
      const channel = await prisma.paymentChannel.findFirst({
        where: { id: channelId, storeId }
      });
      if (!channel) throw new NotFoundException('Payment channel not found');
      if (!channel.isActive) throw new BadRequestException('Payment channel is inactive');

      let actualEmployeeId = employeeId;
      if (role === 'ADMIN' && !employeeId) {
        let adminEmp = await prisma.employee.findFirst({
          where: { storeId, role: 'ADMIN' }
        });
        if (!adminEmp) {
          adminEmp = await prisma.employee.create({
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

      let newBalance = Number(channel.balance);
      const amount = dto.amount;

      if (dto.type === PaymentChannelTxType.DEPOSIT) {
        newBalance += amount;
      } else {
        if (amount > newBalance) {
          throw new BadRequestException('Insufficient balance in payment channel');
        }
        newBalance -= amount;
      }

      const transaction = await prisma.paymentChannelTransaction.create({
        data: {
          storeId,
          paymentChannelId: channel.id,
          employeeId: actualEmployeeId,
          type: dto.type,
          amount,
          description: dto.description
        }
      });

      const updatedChannel = await prisma.paymentChannel.update({
        where: { id: channel.id },
        data: { balance: newBalance }
      });

      return { transaction, channelBalance: updatedChannel.balance };
    });
  }

  async getTransactions(storeId: string, channelId: string, from?: string, to?: string, type?: PaymentChannelTxType) {
    const channel = await this.prisma.paymentChannel.findFirst({
      where: { id: channelId, storeId }
    });
    if (!channel) throw new NotFoundException('Payment channel not found');

    const where: any = { storeId, paymentChannelId: channelId };

    if (type) where.type = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    return this.prisma.paymentChannelTransaction.findMany({
      where,
      include: {
        employee: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
