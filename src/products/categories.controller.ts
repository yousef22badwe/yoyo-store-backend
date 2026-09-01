import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InventoryPinGuard } from '../auth/inventory-pin.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'Create a new product category' })
  @ApiHeader({
    name: 'X-Inventory-Token',
    required: false,
    description: 'Short-lived token returned by POST /auth/inventory-access',
  })
  @UseGuards(InventoryPinGuard)
  @Post()
  create(
    @CurrentUser() user: any,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(user.storeId, createCategoryDto);
  }

  @ApiOperation({ summary: 'Get all product categories for the store' })
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.categoriesService.findAll(user.storeId);
  }
}
