import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateProductDto, Product } from '@exp-shop/shared/interfaces';

@Injectable()
export class AppService {
  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  createProduct(dto: CreateProductDto): Product {
    return { id: randomUUID(), ...dto };
  }
}
