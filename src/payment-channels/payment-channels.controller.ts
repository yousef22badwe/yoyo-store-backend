import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentChannelsService } from './payment-channels.service';
import {
  CreatePaymentChannelDto,
  UpdatePaymentChannelDto,
} from './dto/create-payment-channel.dto';
import { CreateChannelTransactionDto } from './dto/create-channel-transaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { PaymentChannelTxType } from '@prisma/client';

interface PaymentChannelUser {
  storeId: string;
  employeeId?: string;
  role: string;
}

@ApiTags('Payment Channels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payment-channels')
export class PaymentChannelsController {
  constructor(
    private readonly paymentChannelsService: PaymentChannelsService,
  ) {}

  @ApiOperation({ summary: 'Create a new payment channel (Admin only)' })
  @Roles('ADMIN')
  @Post()
  create(
    @CurrentUser() user: PaymentChannelUser,
    @Body() dto: CreatePaymentChannelDto,
  ) {
    return this.paymentChannelsService.create(
      user.storeId,
      user.employeeId,
      user.role,
      dto,
    );
  }

  @ApiOperation({ summary: 'Create any missing default payment channels' })
  @Roles('ADMIN')
  @Post('ensure-defaults')
  ensureDefaults(@CurrentUser() user: PaymentChannelUser) {
    return this.paymentChannelsService.ensureDefaults(user.storeId);
  }

  @ApiOperation({ summary: 'Get all store payment channels' })
  @Get()
  findAll(@CurrentUser() user: PaymentChannelUser) {
    return this.paymentChannelsService.findAll(user.storeId);
  }

  @ApiOperation({ summary: 'Update a payment channel (Admin only)' })
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @CurrentUser() user: PaymentChannelUser,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentChannelDto,
  ) {
    return this.paymentChannelsService.update(user.storeId, id, dto);
  }

  @ApiOperation({
    summary: 'Log a transaction (deposit, withdrawal, service) on a channel',
  })
  @Post(':id/transactions')
  @Roles('ADMIN', 'EMPLOYEE')
  createTransaction(
    @CurrentUser() user: PaymentChannelUser,
    @Param('id') id: string,
    @Body() dto: CreateChannelTransactionDto,
  ) {
    return this.paymentChannelsService.createTransaction(
      user.storeId,
      id,
      user.employeeId,
      user.role,
      dto,
    );
  }

  @ApiOperation({ summary: 'Get transaction history for all store channels' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'type', enum: PaymentChannelTxType, required: false })
  @Get('transactions/all')
  @Roles('ADMIN', 'EMPLOYEE')
  getAllTransactions(
    @CurrentUser() user: PaymentChannelUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: PaymentChannelTxType,
  ) {
    return this.paymentChannelsService.getAllTransactions(
      user.storeId,
      from,
      to,
      type,
    );
  }

  @ApiOperation({ summary: 'Get transaction history for a specific channel' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'type', enum: PaymentChannelTxType, required: false })
  @Get(':id/transactions')
  @Roles('ADMIN', 'EMPLOYEE')
  getTransactions(
    @CurrentUser() user: PaymentChannelUser,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: PaymentChannelTxType,
  ) {
    return this.paymentChannelsService.getTransactions(
      user.storeId,
      id,
      from,
      to,
      type,
    );
  }
}
