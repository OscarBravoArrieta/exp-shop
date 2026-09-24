import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

@InputType()
export class CreateCategoryInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'La imagen es obligatoria' })
  image!: string;

  @Field(() => String)
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'El slug solo puede tener minúsculas, números y guiones' })
  slug!: string;
}
