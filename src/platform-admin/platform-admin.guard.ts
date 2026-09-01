import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization as string | undefined;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.substring(7)
      : null;

    if (!token) {
      throw new UnauthorizedException('Platform admin session is required');
    }

    try {
      const payload = this.jwtService.verify(token);
      if (payload.role !== 'PLATFORM_ADMIN') {
        throw new UnauthorizedException('Invalid platform admin session');
      }
      request.platformAdmin = payload;
      return true;
    } catch (_) {
      throw new UnauthorizedException(
        'Platform admin session is invalid or expired',
      );
    }
  }
}
