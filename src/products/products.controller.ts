import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InventoryPinGuard } from '../auth/inventory-pin.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Create a new product' })
  @ApiHeader({
    name: 'X-Inventory-Token',
    required: false,
    description: 'Short-lived token returned by POST /auth/inventory-access',
  })
  @UseGuards(InventoryPinGuard)
  @Post()
  create(@CurrentUser() user: any, @Body() createProductDto: CreateProductDto) {
    return this.productsService.create(user.storeId, createProductDto);
  }

  @ApiOperation({ summary: 'Get low stock products' })
  @Get('low-stock')
  findLowStock(@CurrentUser() user: any) {
    return this.productsService.findLowStock(user.storeId);
  }

  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name or barcode',
  })
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(user.storeId, categoryId, search);
  }

  @ApiOperation({ summary: 'Get a specific product by ID' })
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.findOne(user.storeId, id);
  }

  @ApiOperation({ summary: 'Update a product' })
  @ApiHeader({
    name: 'X-Inventory-Token',
    required: false,
    description: 'Short-lived token returned by POST /auth/inventory-access',
  })
  @UseGuards(InventoryPinGuard)
  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(user.storeId, id, updateProductDto);
  }

  @ApiOperation({ summary: 'Delete a product (Admin only)' })
  @ApiHeader({
    name: 'X-Inventory-Token',
    required: false,
    description: 'Short-lived token returned by POST /auth/inventory-access',
  })
  @Roles('ADMIN')
  @UseGuards(InventoryPinGuard)
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.remove(user.storeId, id);
  }
}
