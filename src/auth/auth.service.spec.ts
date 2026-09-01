import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService employee login', () => {
  const prisma = {
    employee: { findMany: jest.fn() },
  };
  const jwtService = { sign: jest.fn().mockReturnValue('employee-token') };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma as any, jwtService as any);
  });

  it('issues a store-scoped token for one matching active employee', async () => {
    prisma.employee.findMany.mockResolvedValue([
      {
        id: 'employee-1',
        storeId: 'store-1',
        isActive: true,
        role: 'EMPLOYEE',
        pin: await bcrypt.hash('1234', 4),
        store: {
          isActive: true,
          subscriptionEndsAt: new Date(Date.now() + 60_000),
        },
      },
    ]);

    await expect(
      service.loginEmployee({ phone: '+201098072325', pin: '1234' }),
    ).resolves.toEqual({ access_token: 'employee-token' });
    expect(jwtService.sign).toHaveBeenCalledWith({
      storeId: 'store-1',
      employeeId: 'employee-1',
      role: 'EMPLOYEE',
    });
  });

  it('rejects a PIN that matches more than one legacy duplicate account', async () => {
    const pin = await bcrypt.hash('1234', 4);
    prisma.employee.findMany.mockResolvedValue([
      { id: 'employee-1', pin },
      { id: 'employee-2', pin },
    ]);

    await expect(
      service.loginEmployee({ phone: '+201098072325', pin: '1234' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });
});
