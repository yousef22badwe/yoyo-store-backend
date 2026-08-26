import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CashDrawerService } from './cash-drawer.service';
import { CreateCashDrawerTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TransactionType } from '@prisma/client';

@ApiTags('Cash Drawer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cash-drawer')
export class CashDrawerController {
  constructor(private readonly cashDrawerService: CashDrawerService) {}

  @ApiOperation({ summary: 'Log a manual transaction (e.g. Maintenance, Withdrawal)' })
  @Post('transactions')
  create(@CurrentUser() user: any, @Body() dto: CreateCashDrawerTransactionDto) {
    return this.cashDrawerService.create(user.storeId, user.employeeId, user.role, dto);
  }

  @ApiOperation({ summary: 'Get all store cash drawer transactions' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'type', enum: TransactionType, required: false })
  @Get('transactions')
  findAll(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: TransactionType,
  ) {
    return this.cashDrawerService.findAll(user.storeId, from, to, type);
  }

  @ApiOperation({ summary: 'Get a summary of net cash in drawer for a specific date' })
  @ApiQuery({ name: 'date', required: false, description: 'ISO Date string (defaults to today)' })
  @Get('summary')
  getSummary(@CurrentUser() user: any, @Query('date') date?: string) {
    return this.cashDrawerService.getSummary(user.storeId, date);
  }
}
