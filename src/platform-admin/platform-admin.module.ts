import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secure-yoyo-store-jwt-key',
      signOptions: { expiresIn: '4h' },
    }),
  ],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, PlatformAdminGuard],
})
export class PlatformAdminModule {}
