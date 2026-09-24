import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService, Product as PrismaProduct, Category as PrismaCategory } from '@org/prisma';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';
import { handlePrismaError } from '../common/handle-prisma-error.util';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createProductInput: CreateProductInput): Promise<PrismaProduct> {
    try {
      return await this.prisma.product.create({ data: createProductInput });
    } catch (error) {
      handlePrismaError(error, this.logger, 'un producto');
    }
  }

  findAll(): Promise<PrismaProduct[]> {
    return this.prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<PrismaProduct> {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException(`No existe un producto con id ${id}`);
    }

    return product;
  }

  async update(id: string, updateProductInput: UpdateProductInput): Promise<PrismaProduct> {
    const { id: _ignored, ...rest } = updateProductInput;

    try {
      return await this.prisma.product.update({ where: { id }, data: rest });
    } catch (error) {
      handlePrismaError(error, this.logger, 'un producto');
    }
  }

  async remove(id: string): Promise<PrismaProduct> {
    try {
      return await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      handlePrismaError(error, this.logger, 'un producto');
    }
  }

  /** Usado por ProductsResolver.@ResolveField('category'). */
  findCategoryOf(categoryId: string): Promise<PrismaCategory | null> {
    return this.prisma.category.findUnique({ where: { id: categoryId } });
  }
}
