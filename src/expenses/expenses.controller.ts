import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @ApiOperation({ summary: 'Create a new expense' })
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.storeId, dto);
  }

  @ApiOperation({ summary: 'Get all store expenses' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'category', required: false })
  @Get()
  @Roles('ADMIN')
  findAll(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('category') category?: string,
  ) {
    return this.expensesService.findAll(user.storeId, from, to, category);
  }

  @ApiOperation({ summary: 'Get a summary of expenses grouped by category' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @Get('summary')
  @Roles('ADMIN')
  getSummary(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.expensesService.getSummary(user.storeId, from, to);
  }
}
