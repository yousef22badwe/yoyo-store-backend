import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryPinGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.storeId) {
      throw new ForbiddenException('Invalid authentication context');
    }

    const store = await this.prisma.store.findUnique({
      where: { id: user.storeId },
      select: { inventoryPin: true },
    });

    if (!store?.inventoryPin) {
      return true; // No PIN set, allow access
    }

    const accessToken = request.headers['x-inventory-token'];
    if (typeof accessToken !== 'string' || accessToken.length === 0) {
      throw new ForbiddenException(
        'Inventory access is required for this action',
      );
    }

    try {
      const payload = this.jwtService.verify(accessToken);
      if (
        payload.purpose !== 'INVENTORY_ACCESS' ||
        payload.storeId !== user.storeId
      ) {
        throw new Error('Invalid inventory access token');
      }
    } catch {
      throw new ForbiddenException(
        'Inventory access has expired or is invalid',
      );
    }

    return true;
  }
}
