import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @ApiOperation({ summary: 'Create a new customer' })
  @Post()
  create(@CurrentUser() user: any, @Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(user.storeId, createCustomerDto);
  }

  @ApiOperation({ summary: 'Get all customers' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or phone' })
  @Get()
  findAll(@CurrentUser() user: any, @Query('search') search?: string) {
    return this.customersService.findAll(user.storeId, search);
  }

  @ApiOperation({ summary: 'Get a specific customer by ID with their invoices' })
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customersService.findOne(user.storeId, id);
  }
}
