import { ForbiddenException } from '@nestjs/common';
import { InventoryPinGuard } from './inventory-pin.guard';

describe('InventoryPinGuard', () => {
  const prisma = { store: { findUnique: jest.fn() } };
  const jwtService = { verify: jest.fn() };
  let guard: InventoryPinGuard;

  const contextFor = (request: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new InventoryPinGuard(prisma as any, jwtService as any);
  });

  it('accepts a valid inventory token for the authenticated store', async () => {
    prisma.store.findUnique.mockResolvedValue({ inventoryPin: 'configured' });
    jwtService.verify.mockReturnValue({
      storeId: 'store-1',
      purpose: 'INVENTORY_ACCESS',
    });

    await expect(
      guard.canActivate(
        contextFor({
          user: { storeId: 'store-1' },
          headers: { 'x-inventory-token': 'valid-token' },
        }),
      ),
    ).resolves.toBe(true);
  });

  it('rejects a token issued for a different store', async () => {
    prisma.store.findUnique.mockResolvedValue({ inventoryPin: 'configured' });
    jwtService.verify.mockReturnValue({
      storeId: 'store-2',
      purpose: 'INVENTORY_ACCESS',
    });

    await expect(
      guard.canActivate(
        contextFor({
          user: { storeId: 'store-1' },
          headers: { 'x-inventory-token': 'cross-store-token' },
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows stores that do not have a PIN configured', async () => {
    prisma.store.findUnique.mockResolvedValue({ inventoryPin: null });

    await expect(
      guard.canActivate(
        contextFor({ user: { storeId: 'store-1' }, headers: {} }),
      ),
    ).resolves.toBe(true);
  });
});
