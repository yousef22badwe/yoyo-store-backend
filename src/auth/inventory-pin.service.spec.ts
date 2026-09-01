import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InventoryPinService } from './inventory-pin.service';

describe('InventoryPinService', () => {
  const prisma = {
    store: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const jwtService = {
    sign: jest.fn().mockReturnValue('short-lived-inventory-token'),
  };
  let service: InventoryPinService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryPinService(prisma as any, jwtService as any);
  });

  it('issues fifteen-minute access after checking a hashed PIN', async () => {
    prisma.store.findUnique.mockResolvedValue({
      inventoryPin: await bcrypt.hash('1234', 4),
    });

    await expect(service.issueAccessToken('store-1', '1234')).resolves.toEqual({
      access_token: 'short-lived-inventory-token',
      expires_in: 900,
    });
    expect(jwtService.sign).toHaveBeenCalledWith(
      { storeId: 'store-1', purpose: 'INVENTORY_ACCESS' },
      { expiresIn: '15m' },
    );
  });

  it('rejects a wrong PIN without issuing access', async () => {
    prisma.store.findUnique.mockResolvedValue({
      inventoryPin: await bcrypt.hash('1234', 4),
    });

    await expect(
      service.issueAccessToken('store-1', '9999'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('upgrades an existing plaintext PIN after a successful check', async () => {
    prisma.store.findUnique.mockResolvedValue({ inventoryPin: '1234' });
    prisma.store.update.mockResolvedValue({ id: 'store-1' });

    await service.issueAccessToken('store-1', '1234');

    expect(prisma.store.update).toHaveBeenCalledWith({
      where: { id: 'store-1' },
      data: { inventoryPin: expect.stringMatching(/^\$2[aby]\$/) },
    });
  });
});
