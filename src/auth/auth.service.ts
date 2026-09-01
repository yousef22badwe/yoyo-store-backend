import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterStoreDto } from './dto/register-store.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerStore(dto: RegisterStoreDto) {
    const existingStore = await this.prisma.store.findFirst({
      where: { ownerPhone: dto.ownerPhone },
    });

    if (existingStore) {
      throw new BadRequestException(
        'Store with this owner phone already exists',
      );
    }

    const saltRounds = 10;
    const ownerPasswordHash = await bcrypt.hash(dto.ownerPassword, saltRounds);

    const inventoryPinHash = await bcrypt.hash(dto.inventoryPin, saltRounds);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const store = await this.prisma.store.create({
      data: {
        name: dto.storeName,
        ownerName: dto.ownerName,
        ownerPhone: dto.ownerPhone,
        ownerPasswordHash,
        inventoryPin: inventoryPinHash,
        subscriptionEndsAt: trialEndsAt,
      },
    });

    return {
      message: 'Store successfully registered',
      storeId: store.id,
    };
  }

  async loginAdmin(dto: AdminLoginDto) {
    const store = await this.prisma.store.findFirst({
      where: { ownerPhone: dto.ownerPhone },
    });

    if (!store) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.ownerPassword,
      store.ownerPasswordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    if (!store.isActive) {
      throw new UnauthorizedException('هذا المتجر غير مفعل حالياً');
    }

    if (this.isSubscriptionExpired(store.subscriptionEndsAt)) {
      throw new UnauthorizedException('انتهى اشتراك هذا المتجر');
    }

    const payload = { storeId: store.id, role: 'ADMIN' };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async loginEmployee(dto: EmployeeLoginDto) {
    const candidates = await this.prisma.employee.findMany({
      where: { phone: dto.phone, isActive: true },
      include: { store: true },
    });

    const matchingEmployees = [];
    for (const candidate of candidates) {
      if (await bcrypt.compare(dto.pin, candidate.pin)) {
        matchingEmployees.push(candidate);
      }
    }

    if (matchingEmployees.length !== 1) {
      throw new UnauthorizedException('Invalid phone or pin');
    }

    const employee = matchingEmployees[0];

    if (!employee.isActive || !employee.store.isActive) {
      throw new UnauthorizedException('هذا الحساب غير مفعل حالياً');
    }

    if (this.isSubscriptionExpired(employee.store.subscriptionEndsAt)) {
      throw new UnauthorizedException('انتهى اشتراك هذا المتجر');
    }

    const payload = {
      storeId: employee.storeId,
      employeeId: employee.id,
      role: employee.role, // from DB (e.g. EMPLOYEE or ADMIN)
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getProfile(user: any) {
    if (user.role === 'ADMIN' && !user.employeeId) {
      // It's the store owner
      const store = await this.prisma.store.findUnique({
        where: { id: user.storeId },
      });
      if (!store) throw new UnauthorizedException();
      return {
        id: store.id,
        phone: store.ownerPhone,
        owner_name: store.ownerName,
        store_name: store.name,
        is_active: store.isActive,
        is_admin: true,
        is_store_owner: true,
        role: 'ADMIN',
        created_at: store.createdAt,
        subscription_ends_at: store.subscriptionEndsAt,
      };
    } else {
      // It's an employee
      const employee = await this.prisma.employee.findUnique({
        where: { id: user.employeeId },
        include: { store: true },
      });
      if (!employee) throw new UnauthorizedException();
      return {
        id: employee.id,
        phone: employee.phone,
        owner_name: employee.name, // employee name
        store_name: employee.store.name,
        is_active: employee.isActive && employee.store.isActive,
        is_admin: employee.role === 'ADMIN',
        is_store_owner: false,
        role: employee.role,
        created_at: employee.createdAt,
        subscription_ends_at: employee.store.subscriptionEndsAt,
      };
    }
  }

  private isSubscriptionExpired(subscriptionEndsAt: Date | null): boolean {
    return subscriptionEndsAt !== null && subscriptionEndsAt <= new Date();
  }
}
