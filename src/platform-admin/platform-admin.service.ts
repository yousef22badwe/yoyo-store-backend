import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyKeyDto } from './dto/verify-key.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class PlatformAdminService {
  constructor(private readonly prisma: PrismaService) {}

  verifyKey(dto: VerifyKeyDto) {
    const validSecret = process.env.PLATFORM_ADMIN_SECRET;
    if (dto.key === validSecret) {
      return { valid: true };
    }
    throw new UnauthorizedException({ valid: false });
  }

  async getAllStores() {
    const stores = await this.prisma.store.findMany({
      select: {
        id: true,
        name: true,
        ownerName: true,
        ownerPhone: true,
        isActive: true,
        subscriptionEndsAt: true,
        createdAt: true,
        _count: {
          select: { employees: true }
        }
      }
    });

    return stores.map(store => ({
      ...store,
      employeeCount: store._count.employees,
      _count: undefined,
    }));
  }

  async getStoreById(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        employees: true
      }
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  async toggleActive(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return this.prisma.store.update({
      where: { id },
      data: { isActive: !store.isActive },
    });
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return this.prisma.store.update({
      where: { id },
      data: { subscriptionEndsAt: new Date(dto.subscriptionEndsAt) },
    });
  }
}
