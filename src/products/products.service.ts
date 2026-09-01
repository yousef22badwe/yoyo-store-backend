import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateProductDto) {
    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findFirst({
        where: { id: dto.categoryId, storeId },
      });
      if (!category) {
        throw new NotFoundException('Category not found in this store');
      }
    }

    return this.prisma.product.create({
      data: {
        storeId,
        categoryId: dto.categoryId,
        name: dto.name,
        sku: dto.sku,
        barcode: dto.barcode,
        costPrice: dto.costPrice,
        salePrice: dto.salePrice,
        quantity: dto.quantity,
        minQuantityAlert: dto.minQuantityAlert,
        imageUrl: dto.imageUrl,
        imei: dto.imei,
        condition: dto.condition,
        warrantyMonths: dto.warrantyMonths,
      },
    });
  }

  async findAll(storeId: string, categoryId?: string, search?: string) {
    const where: any = { storeId };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: {
          select: { name: true },
        },
      },
    });
  }

  async findOne(storeId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, storeId },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found in this store');
    }

    return product;
  }

  async findLowStock(storeId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        storeId,
        minQuantityAlert: { not: null },
      },
    });

    return products.filter((p) => p.quantity <= p.minQuantityAlert!);
  }

  async update(storeId: string, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, storeId },
    });

    if (!product) {
      throw new NotFoundException('Product not found in this store');
    }

    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findFirst({
        where: { id: dto.categoryId, storeId },
      });
      if (!category) {
        throw new NotFoundException('Category not found in this store');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async remove(storeId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, storeId },
    });

    if (!product) {
      throw new NotFoundException('Product not found in this store');
    }

    const invoiceItemsCount = await this.prisma.invoiceItem.count({
      where: { productId: id },
    });

    if (invoiceItemsCount > 0) {
      throw new BadRequestException(
        'Cannot delete this product because it is referenced in existing invoices. Consider updating its stock or marking it inactive instead.',
      );
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }
}
