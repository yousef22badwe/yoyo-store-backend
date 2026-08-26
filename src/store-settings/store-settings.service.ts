import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SetInventoryPinDto } from './dto/set-inventory-pin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StoreSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async setInventoryPin(storeId: string, dto: SetInventoryPinDto) {
    const saltRounds = 10;
    const hashedPin = await bcrypt.hash(dto.inventoryPin, saltRounds);

    await this.prisma.store.update({
      where: { id: storeId },
      data: { inventoryPin: hashedPin },
    });

    return { message: 'Inventory PIN successfully set' };
  }
}
