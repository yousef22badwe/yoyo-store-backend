import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secure-yoyo-store-jwt-key',
    });
  }

  async validate(payload: any) {
    const store = await this.prisma.store.findUnique({
      where: { id: payload.storeId },
      select: {
        id: true,
        isActive: true,
        subscriptionEndsAt: true,
      },
    });

    if (!store || !store.isActive) {
      throw new UnauthorizedException('Store is not active');
    }
    if (store.subscriptionEndsAt && store.subscriptionEndsAt <= new Date()) {
      throw new UnauthorizedException('Store subscription has expired');
    }

    if (payload.employeeId) {
      const employee = await this.prisma.employee.findFirst({
        where: {
          id: payload.employeeId,
          storeId: payload.storeId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!employee) {
        throw new UnauthorizedException('Employee account is not active');
      }
    }

    return {
      storeId: payload.storeId,
      employeeId: payload.employeeId,
      role: payload.role,
    };
  }
}
