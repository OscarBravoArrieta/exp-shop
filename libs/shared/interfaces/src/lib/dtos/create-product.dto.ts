import { IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import type { Product } from '../models/product.model';

export class CreateProductDto implements Omit<Product, 'id'> {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsNumber()
  @IsPositive()
  price!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
