import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { GraphQLModule } from '@nestjs/graphql';
import { PrismaModule } from '@org/prisma';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppResolver } from './app.resolver';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';

@Module({
     imports: [
         ConfigModule.forRoot(),
         PrismaModule,
         GraphQLModule.forRoot<ApolloDriverConfig>({
         driver: ApolloDriver,
         autoSchemaFile: true,
         useGlobalPrefix: true,
         playground: false,
         plugins: [
             ApolloServerPluginLandingPageLocalDefault({})
         ],
     }),
        UsersModule,
        AuthModule,
        CategoriesModule,
        ProductsModule,
    ],
     controllers: [AppController],
     providers: [AppService, AppResolver],
 })
 export class AppModule {}
