import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

@InputType()
export class CreateProductInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title!: string;

  @Field(() => Float)
  @IsNumber()
  @IsPositive({ message: 'El precio debe ser mayor que 0' })
  price!: number;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  description!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @Field(() => String)
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'El slug solo puede tener minúsculas, números y guiones' })
  slug!: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  quantity?: number;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
