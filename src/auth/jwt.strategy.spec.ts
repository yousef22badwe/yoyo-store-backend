import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const prisma = {
    store: { findUnique: jest.fn() },
    employee: { findFirst: jest.fn() },
  };
  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(prisma as any);
  });

  it('accepts a token only while its store is active and subscribed', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: 'store-1',
      isActive: true,
      subscriptionEndsAt: new Date(Date.now() + 60_000),
    });

    await expect(
      strategy.validate({ storeId: 'store-1', role: 'ADMIN' }),
    ).resolves.toEqual({
      storeId: 'store-1',
      employeeId: undefined,
      role: 'ADMIN',
    });
  });

  it('rejects an existing token after the subscription expires', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: 'store-1',
      isActive: true,
      subscriptionEndsAt: new Date(Date.now() - 60_000),
    });

    await expect(
      strategy.validate({ storeId: 'store-1', role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token when the employee has been deactivated', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: 'store-1',
      isActive: true,
      subscriptionEndsAt: new Date(Date.now() + 60_000),
    });
    prisma.employee.findFirst.mockResolvedValue(null);

    await expect(
      strategy.validate({
        storeId: 'store-1',
        employeeId: 'employee-1',
        role: 'EMPLOYEE',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
