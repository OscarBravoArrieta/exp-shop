import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { Category } from '../categories/category.entity';

@ObjectType('Product')
export class Product {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => String)
  description!: string;

  @Field(() => [String])
  images!: string[];

  @Field(() => String)
  slug!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => ID, { nullable: true })
  categoryId!: string | null;

  /** Resuelto por @ResolveField() en ProductsResolver, no viene de la query base. */
  @Field(() => Category, { nullable: true })
  category?: Category | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
