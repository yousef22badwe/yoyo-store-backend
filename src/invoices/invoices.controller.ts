import {
  Controller,
  Get,
  Post,
  Body,
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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { InvoiceStatus } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @ApiOperation({ summary: 'Create a new invoice and process transaction' })
  @Post()
  create(@CurrentUser() user: any, @Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(
      user.storeId,
      user.employeeId,
      user.role,
      createInvoiceDto,
    );
  }

  @ApiOperation({ summary: 'Get all invoices' })
  @ApiQuery({ name: 'status', enum: InvoiceStatus, required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @Get()
  @Roles('ADMIN')
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: InvoiceStatus,
    @Query('customerId') customerId?: string,
  ) {
    return this.invoicesService.findAll(user.storeId, status, customerId);
  }

  @ApiOperation({ summary: 'Get a specific invoice by ID' })
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoicesService.findOne(user.storeId, id);
  }

  @ApiOperation({
    summary: 'Add a payment to an existing credit/partial invoice',
  })
  @Post(':id/payments')
  addPayment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.invoicesService.addPayment(user.storeId, id, createPaymentDto);
  }
}
