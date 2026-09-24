import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService, Category as PrismaCategory, Product as PrismaProduct } from '@org/prisma';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';
import { handlePrismaError } from '../common/handle-prisma-error.util';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryInput: CreateCategoryInput): Promise<PrismaCategory> {
    try {
      return await this.prisma.category.create({ data: createCategoryInput });
    } catch (error) {
      handlePrismaError(error, this.logger, 'una categoría');
    }
  }

  findAll(): Promise<PrismaCategory[]> {
    return this.prisma.category.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<PrismaCategory> {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException(`No existe una categoría con id ${id}`);
    }

    return category;
  }

  async update(id: string, updateCategoryInput: UpdateCategoryInput): Promise<PrismaCategory> {
    const { id: _ignored, ...rest } = updateCategoryInput;

    try {
      return await this.prisma.category.update({ where: { id }, data: rest });
    } catch (error) {
      handlePrismaError(error, this.logger, 'una categoría');
    }
  }

  async remove(id: string): Promise<PrismaCategory> {
    try {
      return await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      handlePrismaError(error, this.logger, 'una categoría');
    }
  }

  /** Usado por CategoriesResolver.@ResolveField('products'). */
  findProductsByCategory(categoryId: string): Promise<PrismaProduct[]> {
    return this.prisma.product.findMany({ where: { categoryId } });
  }
}
