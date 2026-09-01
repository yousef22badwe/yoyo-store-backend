import { UnauthorizedException } from '@nestjs/common';
import { PlatformAdminService } from './platform-admin.service';

describe('PlatformAdminService', () => {
  const originalSecret = process.env.PLATFORM_ADMIN_SECRET;
  const prisma = {
    store: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const jwtService = {
    sign: jest.fn().mockReturnValue('signed-platform-token'),
  };
  let service: PlatformAdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PLATFORM_ADMIN_SECRET = 'server-only-secret';
    service = new PlatformAdminService(prisma as any, jwtService as any);
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.PLATFORM_ADMIN_SECRET;
    } else {
      process.env.PLATFORM_ADMIN_SECRET = originalSecret;
    }
  });

  it('issues a short-lived platform token for the server secret', () => {
    expect(service.verifyKey({ key: 'server-only-secret' })).toEqual({
      valid: true,
      access_token: 'signed-platform-token',
      expires_in: 14400,
    });
    expect(jwtService.sign).toHaveBeenCalledWith({ role: 'PLATFORM_ADMIN' });
  });

  it('rejects an invalid platform secret', () => {
    expect(() => service.verifyKey({ key: 'wrong-secret' })).toThrow(
      UnauthorizedException,
    );
  });

  it('reactivates a store when its subscription is renewed', async () => {
    const subscriptionEndsAt = '2027-08-30T00:00:00.000Z';
    prisma.store.findUnique.mockResolvedValue({ id: 'store-1' });
    prisma.store.update.mockResolvedValue({
      id: 'store-1',
      isActive: true,
      subscriptionEndsAt: new Date(subscriptionEndsAt),
    });

    await service.updateSubscription('store-1', { subscriptionEndsAt });

    expect(prisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'store-1' },
        data: {
          subscriptionEndsAt: new Date(subscriptionEndsAt),
          isActive: true,
        },
      }),
    );
  });
});
