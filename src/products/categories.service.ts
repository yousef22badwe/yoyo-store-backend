import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.productCategory.findFirst({
        where: { id: dto.parentId, storeId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found in this store');
      }
    }

    return this.prisma.productCategory.create({
      data: {
        storeId,
        name: dto.name,
        parentId: dto.parentId,
      },
    });
  }

  async findAll(storeId: string) {
    return this.prisma.productCategory.findMany({
      where: { storeId },
    });
  }
}
