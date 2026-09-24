import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

/**
 * AuthGuard('jwt') sabe extraer request/response de HTTP (Express) por
 * defecto, pero no de GraphQL. Sobreescribir getRequest() con
 * GqlExecutionContext es lo que lo hace funcionar dentro de un resolver.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
