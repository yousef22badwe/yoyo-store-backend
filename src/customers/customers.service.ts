import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        storeId,
        name: dto.name,
        phone: dto.phone,
      },
    });
  }

  async findAll(storeId: string, search?: string) {
    const where: any = { storeId };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.customer.findMany({
      where,
    });
  }

  async findOne(storeId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, storeId },
      include: {
        invoices: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found in this store');
    }

    return customer;
  }
}
