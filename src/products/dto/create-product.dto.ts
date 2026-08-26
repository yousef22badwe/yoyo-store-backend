import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, Min, IsEnum } from 'class-validator';
import { ProductCondition } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'The name of the product', example: 'Coca Cola 1L' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'The ID of the category', example: 'uuid-1234' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Stock Keeping Unit', example: 'BEV-COKE-1L' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ description: 'Barcode for scanning', example: '123456789012' })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiPropertyOptional({ description: 'IMEI number for phones', example: '123456789012345' })
  @IsString()
  @IsOptional()
  imei?: string;

  @ApiPropertyOptional({ description: 'Condition of the product', enum: ProductCondition })
  @IsEnum(ProductCondition)
  @IsOptional()
  condition?: ProductCondition;

  @ApiPropertyOptional({ description: 'Warranty duration in months', example: 12 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  warrantyMonths?: number;

  @ApiProperty({ description: 'Cost price of the product', example: 10.5 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  costPrice: number;

  @ApiProperty({ description: 'Selling price of the product', example: 15.0 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  salePrice: number;

  @ApiProperty({ description: 'Current stock quantity', example: 100 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({ description: 'Alert when quantity drops to this level', example: 10 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minQuantityAlert?: number;

  @ApiPropertyOptional({ description: 'URL for the product image', example: 'https://example.com/coke.png' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
