import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @ApiOperation({ summary: 'Create a new employee (Admin only)' })
  @Post()
  create(@CurrentUser() user: any, @Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(user.storeId, createEmployeeDto);
  }

  @ApiOperation({ summary: 'Get all employees in the store (Admin only)' })
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.employeesService.findAll(user.storeId);
  }

  @ApiOperation({ summary: 'Get a specific employee by ID (Admin only)' })
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.findOne(user.storeId, id);
  }

  @ApiOperation({ summary: 'Update an employee details (Admin only)' })
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeesService.update(user.storeId, id, updateEmployeeDto);
  }

  @ApiOperation({ summary: 'Soft delete an employee (Admin only)' })
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.remove(user.storeId, id);
  }
}
