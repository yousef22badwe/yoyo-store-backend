import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateEmployeeDto) {
    const phoneInUse = await this.prisma.employee.findFirst({
      where: { phone: dto.phone, isActive: true },
      select: { id: true },
    });
    if (phoneInUse) {
      throw new ConflictException(
        'This phone number is already used by another employee',
      );
    }

    const saltRounds = 10;
    const pinHash = await bcrypt.hash(dto.pin, saltRounds);

    const employee = await this.prisma.employee.create({
      data: {
        storeId,
        name: dto.name,
        phone: dto.phone,
        pin: pinHash,
        role: dto.role,
        shiftStartMinutes: dto.shiftStartMinutes,
        graceMinutes: dto.graceMinutes,
        workDays: dto.workDays,
      },
    });

    const { pin, ...result } = employee;
    return result;
  }

  async findAll(storeId: string) {
    const employees = await this.prisma.employee.findMany({
      where: {
        storeId,
        isActive: true,
        NOT: { name: 'Store Owner', phone: '0000000000' },
      },
    });

    return employees.map((employee) => {
      const { pin, ...result } = employee;
      return result;
    });
  }

  async findOne(storeId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, storeId },
    });

    if (!employee) {
      throw new NotFoundException(
        'Employee not found or does not belong to this store',
      );
    }

    const { pin, ...result } = employee;
    return result;
  }

  async update(storeId: string, id: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, storeId },
    });

    if (!employee) {
      throw new NotFoundException(
        'Employee not found or does not belong to this store',
      );
    }

    if (dto.phone && dto.phone !== employee.phone) {
      const phoneInUse = await this.prisma.employee.findFirst({
        where: { phone: dto.phone, isActive: true, NOT: { id } },
        select: { id: true },
      });
      if (phoneInUse) {
        throw new ConflictException(
          'This phone number is already used by another employee',
        );
      }
    }

    const updateData: any = { ...dto };

    if (dto.pin) {
      const saltRounds = 10;
      updateData.pin = await bcrypt.hash(dto.pin, saltRounds);
    }

    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: updateData,
    });

    const { pin, ...result } = updatedEmployee;
    return result;
  }

  async remove(storeId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, storeId },
    });

    if (!employee) {
      throw new NotFoundException(
        'Employee not found or does not belong to this store',
      );
    }

    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });

    const { pin, ...result } = updatedEmployee;
    return result;
  }
}
