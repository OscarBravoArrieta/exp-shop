import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';
import { Product } from '../products/product.entity';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ValidRoles } from '../auth/enums/valid-roles.enum';
import { User } from '../users/user.entity';

/**
 * A diferencia de UsersResolver (todo admin-only), acá la LECTURA es pública
 * a propósito: cualquiera puede navegar el catálogo sin loguearse. Solo
 * crear/editar/borrar categorías exige rol admin.
 */
@Resolver(() => Category)
export class CategoriesResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Query(() => [Category], { name: 'categories' })
  findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Query(() => Category, { name: 'category' })
  findOne(@Args('id', { type: () => ID }) id: string): Promise<Category> {
    return this.categoriesService.findOne(id);
  }

  @Mutation(() => Category, { name: 'createCategory' })
  @UseGuards(JwtAuthGuard)
  createCategory(
    @Args('createCategoryInput') createCategoryInput: CreateCategoryInput,
    @CurrentUser([ValidRoles.admin]) _admin: User,
  ): Promise<Category> {
    return this.categoriesService.create(createCategoryInput);
  }

  @Mutation(() => Category, { name: 'updateCategory' })
  @UseGuards(JwtAuthGuard)
  updateCategory(
    @Args('updateCategoryInput') updateCategoryInput: UpdateCategoryInput,
    @CurrentUser([ValidRoles.admin]) _admin: User,
  ): Promise<Category> {
    return this.categoriesService.update(updateCategoryInput.id, updateCategoryInput);
  }

  @Mutation(() => Category, { name: 'removeCategory' })
  @UseGuards(JwtAuthGuard)
  removeCategory(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser([ValidRoles.admin]) _admin: User,
  ): Promise<Category> {
    return this.categoriesService.remove(id);
  }

  @ResolveField(() => [Product])
  products(@Parent() category: Category): Promise<Product[]> {
    return this.categoriesService.findProductsByCategory(category.id);
  }
}
