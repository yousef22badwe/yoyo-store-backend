import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformAdminGuard } from './platform-admin.guard';
import { VerifyKeyDto } from './dto/verify-key.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@ApiTags('Platform Admin')
@Controller('platform-admin')
export class PlatformAdminController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @ApiOperation({ summary: 'Verify the platform admin super key' })
  @ApiResponse({
    status: 200,
    description: 'Key is valid',
    schema: { example: { valid: true } },
  })
  @ApiResponse({
    status: 401,
    description: 'Key is invalid',
    schema: { example: { valid: false } },
  })
  @HttpCode(HttpStatus.OK)
  @Post('verify-key')
  verifyKey(@Body() dto: VerifyKeyDto) {
    return this.platformAdminService.verifyKey(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all stores with their employee count' })
  @UseGuards(PlatformAdminGuard)
  @Get('stores')
  getAllStores() {
    return this.platformAdminService.getAllStores();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full details of a single store' })
  @ApiParam({ name: 'id', description: 'Store ID' })
  @UseGuards(PlatformAdminGuard)
  @Get('stores/:id')
  getStoreById(@Param('id') id: string) {
    return this.platformAdminService.getStoreById(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle a store active/inactive status' })
  @ApiParam({ name: 'id', description: 'Store ID' })
  @UseGuards(PlatformAdminGuard)
  @Patch('stores/:id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.platformAdminService.toggleActive(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a store subscription end date' })
  @ApiParam({ name: 'id', description: 'Store ID' })
  @UseGuards(PlatformAdminGuard)
  @Patch('stores/:id/subscription')
  updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.platformAdminService.updateSubscription(id, dto);
  }
}
