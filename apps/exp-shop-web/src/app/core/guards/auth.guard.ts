import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

/**
 * Para cuando este guard corre, `Auth.checkAuthStatus()` ya se resolvió —
 * se lanza como `provideAppInitializer` en app.config.ts, y Angular bloquea
 * el arranque de la app (y por lo tanto la primera navegación del router)
 * hasta que ese observable completa. `isAuthenticated()` nunca se lee acá
 * en su estado intermedio 'checking'.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth-login']);
};
