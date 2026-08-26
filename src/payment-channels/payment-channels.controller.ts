import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentChannelsService } from './payment-channels.service';
import { CreatePaymentChannelDto, UpdatePaymentChannelDto } from './dto/create-payment-channel.dto';
import { CreateChannelTransactionDto } from './dto/create-channel-transaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { PaymentChannelTxType } from '@prisma/client';

@ApiTags('Payment Channels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payment-channels')
export class PaymentChannelsController {
  constructor(private readonly paymentChannelsService: PaymentChannelsService) {}

  @ApiOperation({ summary: 'Create a new payment channel (Admin only)' })
  @Roles('ADMIN')
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreatePaymentChannelDto) {
    return this.paymentChannelsService.create(user.storeId, dto);
  }

  @ApiOperation({ summary: 'Get all store payment channels' })
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.paymentChannelsService.findAll(user.storeId);
  }

  @ApiOperation({ summary: 'Update a payment channel (Admin only)' })
  @Roles('ADMIN')
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdatePaymentChannelDto) {
    return this.paymentChannelsService.update(user.storeId, id, dto);
  }

  @ApiOperation({ summary: 'Log a transaction (deposit, withdrawal, service) on a channel' })
  @Post(':id/transactions')
  createTransaction(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateChannelTransactionDto) {
    return this.paymentChannelsService.createTransaction(user.storeId, id, user.employeeId, user.role, dto);
  }

  @ApiOperation({ summary: 'Get transaction history for a specific channel' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'type', enum: PaymentChannelTxType, required: false })
  @Get(':id/transactions')
  getTransactions(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: PaymentChannelTxType
  ) {
    return this.paymentChannelsService.getTransactions(user.storeId, id, from, to, type);
  }
}
