import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  it('blocks an employee from an admin-only endpoint', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    };
    const guard = new RolesGuard(reflector as any);
    const context = {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'EMPLOYEE' } }),
      }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows an administrator through an admin-only endpoint', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    };
    const guard = new RolesGuard(reflector as any);
    const context = {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'ADMIN' } }),
      }),
    } as any;

    expect(guard.canActivate(context)).toBe(true);
  });
});
