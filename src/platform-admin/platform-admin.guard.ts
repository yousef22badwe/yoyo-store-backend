import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminSecret = request.headers['x-admin-secret'];

    const validSecret = process.env.PLATFORM_ADMIN_SECRET;

    if (!adminSecret || adminSecret !== validSecret) {
      throw new ForbiddenException('Invalid Platform Admin Secret');
    }

    return true;
  }
}
