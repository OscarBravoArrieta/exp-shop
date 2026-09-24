import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ValidRoles } from '../auth/enums/valid-roles.enum';

/**
 * Tipo de GraphQL para `User`. Deliberadamente separado del modelo de Prisma
 * (que ya trae su propio tipo `User` generado) y de la interfaz `User` de
 * `@exp-shop/shared/interfaces` (esa la consume Angular por REST): mezclar
 * decoradores de GraphQL en cualquiera de esos dos arrastraría dependencias
 * de servidor (`@nestjs/graphql`) hacia el frontend o hacia la capa de datos.
 *
 * Nunca declara `password` como `@Field()` — aunque el objeto que devuelva el
 * servicio traiga el hash (lo necesita, por ejemplo, el futuro login), GraphQL
 * solo serializa los campos declarados aquí, así que el hash nunca sale por la API.
 */
@ObjectType('User')
export class User {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  fullName!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  avatar!: string | null;

  @Field(() => [ValidRoles])
  roles!: string[];

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
