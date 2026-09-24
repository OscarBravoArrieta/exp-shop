import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ValidRoles } from '../enums/valid-roles.enum';
import { User } from '../../users/user.entity';

/**
 * Lee el usuario que JwtAuthGuard dejó en `request.user` (vía Passport) y,
 * opcionalmente, exige que tenga alguno de los roles pasados como argumento.
 * Solo tiene sentido usarlo en un resolver que ya tenga @UseGuards(JwtAuthGuard)
 * — sin el guard, nadie llenó `request.user` y esto lanza explícitamente.
 */
export const CurrentUser = createParamDecorator(
  (roles: ValidRoles[] = [], context: ExecutionContext): User => {
    const ctx = GqlExecutionContext.create(context);
    const user: User = ctx.getContext().req.user;

    if (!user) {
      throw new InternalServerErrorException(
        'No hay usuario en el request — revisa que el resolver tenga @UseGuards(JwtAuthGuard)',
      );
    }

    if (roles.length === 0) return user;

    for (const role of user.roles) {
      if (roles.includes(role as ValidRoles)) {
        return user;
      }
    }

    throw new ForbiddenException(
      `El usuario ${user.fullName} necesita alguno de estos roles: [${roles}]`,
    );
  },
);
