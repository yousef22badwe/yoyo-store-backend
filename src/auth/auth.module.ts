import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryPinService } from './inventory-pin.service';
import { InventoryPinGuard } from './inventory-pin.guard';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secure-yoyo-store-jwt-key',
      signOptions: { expiresIn: '7d' }, // Token valid for 7 days
    }),
  ],
  providers: [AuthService, JwtStrategy, InventoryPinService, InventoryPinGuard],
  controllers: [AuthController],
  exports: [JwtModule, InventoryPinService, InventoryPinGuard],
})
export class AuthModule {}
