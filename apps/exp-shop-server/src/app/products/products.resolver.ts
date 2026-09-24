import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ProductsService } from './products.service';
import { Product } from './product.entity';
import { Category } from '../categories/category.entity';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ValidRoles } from '../auth/enums/valid-roles.enum';
import { User } from '../users/user.entity';

/** Misma idea que CategoriesResolver: catálogo público de lectura, escritura admin-only. */
@Resolver(() => Product)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Query(() => [Product], { name: 'products' })
  findAll(): Promise<Product[]> {
    return this.productsService.findAll();
  }

  @Query(() => Product, { name: 'product' })
  findOne(@Args('id', { type: () => ID }) id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @Mutation(() => Product, { name: 'createProduct' })
  @UseGuards(JwtAuthGuard)
  createProduct(
    @Args('createProductInput') createProductInput: CreateProductInput,
    @CurrentUser([ValidRoles.admin]) _admin: User,
  ): Promise<Product> {
    return this.productsService.create(createProductInput);
  }

  @Mutation(() => Product, { name: 'updateProduct' })
  @UseGuards(JwtAuthGuard)
  updateProduct(
    @Args('updateProductInput') updateProductInput: UpdateProductInput,
    @CurrentUser([ValidRoles.admin]) _admin: User,
  ): Promise<Product> {
    return this.productsService.update(updateProductInput.id, updateProductInput);
  }

  @Mutation(() => Product, { name: 'removeProduct' })
  @UseGuards(JwtAuthGuard)
  removeProduct(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser([ValidRoles.admin]) _admin: User,
  ): Promise<Product> {
    return this.productsService.remove(id);
  }

  @ResolveField(() => Category, { nullable: true })
  category(@Parent() product: Product): Promise<Category | null> {
    if (!product.categoryId) {
      return Promise.resolve(null);
    }

    return this.productsService.findCategoryOf(product.categoryId);
  }
}
