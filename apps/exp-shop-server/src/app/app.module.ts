import { Module } from '@nestjs/common';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { GraphQLModule } from '@nestjs/graphql';
import { PrismaModule } from '@org/prisma';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppResolver } from './app.resolver';

@Module({
     imports: [
         PrismaModule,
         GraphQLModule.forRoot<ApolloDriverConfig>({
         driver: ApolloDriver,
         autoSchemaFile: true,
         playground: false,
         plugins: [
             ApolloServerPluginLandingPageLocalDefault({})
         ],
     }),
    ],
     controllers: [AppController],
     providers: [AppService, AppResolver],
 })
 export class AppModule {}
