import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Reports & Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({ summary: 'Get Dashboard Summary' })
  @ApiQuery({ name: 'date', required: false, description: 'Optional date for the summary (defaults to today)' })
  @Get('dashboard-summary')
  getDashboardSummary(@CurrentUser() user: any, @Query('date') date?: string) {
    return this.reportsService.getDashboardSummary(user.storeId, date);
  }

  @ApiOperation({ summary: 'Get Sales Chart Data' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (e.g. 2026-08-01)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (e.g. 2026-08-31)' })
  @Get('sales-chart')
  getSalesChart(
    @CurrentUser() user: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException('Both "from" and "to" parameters are required');
    }
    return this.reportsService.getSalesChart(user.storeId, from, to);
  }

  @ApiOperation({ summary: 'Get Top Selling Products' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('top-products')
  getTopProducts(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getTopProducts(user.storeId, from, to, limit);
  }

  @ApiOperation({ summary: 'Get Employee Performance' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @Get('employee-performance')
  getEmployeePerformance(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getEmployeePerformance(user.storeId, from, to);
  }
}
