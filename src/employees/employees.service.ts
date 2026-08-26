import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateEmployeeDto) {
    const saltRounds = 10;
    const pinHash = await bcrypt.hash(dto.pin, saltRounds);

    const employee = await this.prisma.employee.create({
      data: {
        storeId,
        name: dto.name,
        phone: dto.phone,
        pin: pinHash,
        role: dto.role,
      },
    });

    const { pin, ...result } = employee;
    return result;
  }

  async findAll(storeId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { storeId },
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
      throw new NotFoundException('Employee not found or does not belong to this store');
    }

    const { pin, ...result } = employee;
    return result;
  }

  async update(storeId: string, id: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, storeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found or does not belong to this store');
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
      throw new NotFoundException('Employee not found or does not belong to this store');
    }

    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });

    const { pin, ...result } = updatedEmployee;
    return result;
  }
}
