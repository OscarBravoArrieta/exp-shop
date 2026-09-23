 import { Body, Controller, Get, Post } from '@nestjs/common';
 import { CreateProductDto, Product } from '@exp-shop/shared/interfaces';
 import { AppService } from './app.service';

 @Controller()
 export class AppController {
     constructor(private readonly appService: AppService) {}

     @Get()
     getData() {
         return this.appService.getData();
     }

     @Post('products')
     createProduct(@Body() dto: CreateProductDto): Product {
         return this.appService.createProduct(dto);
     }
 }
