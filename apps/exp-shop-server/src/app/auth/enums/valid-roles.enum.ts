import { registerEnumType } from '@nestjs/graphql';

/**
 * Roles válidos de un usuario. Tomado del proyecto de referencia
 * (nest-anylist/src/auth/enums/valid-roles.enums.ts). A diferencia de ese
 * proyecto (TypeORM, sin tipo real en la columna), acá `roles` en el schema
 * de Prisma es `String[]` — este enum es lo que garantiza, del lado de la
 * aplicación (inputs de GraphQL + entidad de salida), que esos strings solo
 * puedan ser uno de estos tres valores.
 */
export enum ValidRoles {
  admin = 'admin',
  user = 'user',
  superUser = 'superUser',
}

registerEnumType(ValidRoles, {
  name: 'ValidRoles',
  description: 'Roles válidos para un usuario de exp-shop',
});
