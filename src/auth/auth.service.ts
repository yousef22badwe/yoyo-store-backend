import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
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
      throw new BadRequestException('Store with this owner phone already exists');
    }

    const saltRounds = 10;
    const ownerPasswordHash = await bcrypt.hash(dto.ownerPassword, saltRounds);
    const inventoryPinHash = dto.inventoryPin ? await bcrypt.hash(dto.inventoryPin, saltRounds) : null;

    const store = await this.prisma.store.create({
      data: {
        name: dto.storeName,
        ownerName: dto.ownerName,
        ownerPhone: dto.ownerPhone,
        ownerPasswordHash,
        inventoryPin: inventoryPinHash,
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

    const isPasswordValid = await bcrypt.compare(dto.ownerPassword, store.ownerPasswordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    if (!store.isActive) {
      throw new UnauthorizedException('Store is not active');
    }

    const payload = { storeId: store.id, role: 'ADMIN' };
    
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async loginEmployee(dto: EmployeeLoginDto) {
    // We assume the employee login might also require store context, 
    // but the prompt only said "Find the employee by phone within their store".
    // Since phone numbers might be unique per store, let's just find by phone first.
    // If it's a multi-tenant system, phone numbers for employees might be unique globally, 
    // or we'd need storeId in the login body. The prompt said "Body: phone, pin".
    // We will search for any active employee with this phone.
    const employee = await this.prisma.employee.findFirst({
      where: { phone: dto.phone },
      include: { store: true }
    });

    if (!employee) {
      throw new UnauthorizedException('Invalid phone or pin');
    }

    if (!employee.isActive || !employee.store.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    const isPinValid = await bcrypt.compare(dto.pin, employee.pin);

    if (!isPinValid) {
      throw new UnauthorizedException('Invalid phone or pin');
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
        where: { id: user.storeId }
      });
      if (!store) throw new UnauthorizedException();
      return {
        id: store.id,
        phone: store.ownerPhone,
        owner_name: store.ownerName,
        store_name: store.name,
        is_active: store.isActive,
        is_admin: true,
        created_at: store.createdAt,
        subscription_ends_at: store.subscriptionEndsAt,
      };
    } else {
      // It's an employee
      const employee = await this.prisma.employee.findUnique({
        where: { id: user.employeeId },
        include: { store: true }
      });
      if (!employee) throw new UnauthorizedException();
      return {
        id: employee.id,
        phone: employee.phone,
        owner_name: employee.name, // employee name
        store_name: employee.store.name,
        is_active: employee.isActive && employee.store.isActive,
        is_admin: employee.role === 'ADMIN',
        created_at: employee.createdAt,
        subscription_ends_at: employee.store.subscriptionEndsAt,
      };
    }
  }
}
