import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoreSettingsService } from './store-settings.service';
import { SetInventoryPinDto } from './dto/set-inventory-pin.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Store Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('store')
export class StoreSettingsController {
  constructor(private readonly storeSettingsService: StoreSettingsService) {}

  @ApiOperation({ summary: 'Set or update the store inventory PIN (Admin only)' })
  @Roles('ADMIN')
  @Post('inventory-pin')
  setInventoryPin(@CurrentUser() user: any, @Body() dto: SetInventoryPinDto) {
    return this.storeSettingsService.setInventoryPin(user.storeId, dto);
  }
}
