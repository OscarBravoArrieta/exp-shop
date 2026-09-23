 import { Module } from '@nestjs/common';
 import { UsersResolver } from './users.resolver';
 import { UsersService } from './users.service';

 /**
  * No importa PrismaModule: es @Global() (ver libs/backend/prisma), así que
  * PrismaService ya está disponible en todo el árbol de módulos de la app.
  *
  * Exporta UsersService a propósito: el futuro AuthModule lo va a necesitar
  * inyectar para `signup`/`login`, igual que en el proyecto de referencia.
  */
 @Module({
     providers: [UsersResolver, UsersService],
    exports: [UsersService],
 })
 export class UsersModule {}
