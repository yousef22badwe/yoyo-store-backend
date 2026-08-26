import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secure-yoyo-store-jwt-key',
    });
  }

  async validate(payload: any) {
    return {
      storeId: payload.storeId,
      employeeId: payload.employeeId,
      role: payload.role,
    };
  }
}
