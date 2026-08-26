import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InventoryPinGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || !user.storeId) {
      throw new ForbiddenException('Invalid authentication context');
    }

    const providedPin = request.headers['x-inventory-pin'];

    const store = await this.prisma.store.findUnique({
      where: { id: user.storeId },
      select: { inventoryPin: true },
    });

    if (!store?.inventoryPin) {
      return true; // No PIN set, allow access
    }

    if (!providedPin) {
      throw new ForbiddenException('Inventory PIN is required for this action');
    }

    const isMatch = providedPin === store.inventoryPin;
    if (!isMatch) {
      throw new ForbiddenException('Invalid Inventory PIN');
    }

    return true;
  }
}
