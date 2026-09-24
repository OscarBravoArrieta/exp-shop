import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Product } from '../products/product.entity';

/**
 * `products` no se llena en las queries base (findAll/findOne) — la resuelve
 * @ResolveField() en CategoriesResolver, solo si el cliente GraphQL la pide.
 * `() => Product` en @Field es un thunk: se evalúa recién cuando se leen los
 * metadatos, así que el import circular con product.entity.ts no es problema.
 */
@ObjectType('Category')
export class Category {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  image!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => [Product])
  products?: Product[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
