import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InventoryPinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async issueAccessToken(storeId: string, pin: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { inventoryPin: true },
    });

    if (!store) {
      throw new UnauthorizedException('Store not found');
    }

    if (store.inventoryPin) {
      const isHashed = /^\$2[aby]\$/.test(store.inventoryPin);
      const isValid = isHashed
        ? await bcrypt.compare(pin, store.inventoryPin)
        : pin === store.inventoryPin;

      if (!isValid) {
        throw new UnauthorizedException('Invalid security PIN');
      }

      // Upgrade stores created before PIN hashing was introduced.
      if (!isHashed) {
        await this.prisma.store.update({
          where: { id: storeId },
          data: { inventoryPin: await bcrypt.hash(pin, 10) },
        });
      }
    }

    return {
      access_token: this.jwtService.sign(
        { storeId, purpose: 'INVENTORY_ACCESS' },
        { expiresIn: '15m' },
      ),
      expires_in: 15 * 60,
    };
  }
}
