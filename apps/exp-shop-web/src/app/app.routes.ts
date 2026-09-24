import { Route } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Unauthorized } from './shared/components/unauthorized/unauthorized';
import { NotFound } from './shared/components/not-found/not-found';
import { authGuard } from './core/guards/auth.guard';
import authRoutes from './auth/auth.routes';

export const appRoutes: Route[] = [
    // Rutas públicas (login) — a propósito FUERA de Layout: no debe verse
    // envuelto en el header/sidebar/footer de la app principal. Se importan
    // (no se cargan perezosamente como loadChildren) para que 'auth-login'
    // quede como ruta de nivel superior con su propio path concreto — el
    // componente Login sigue cargando perezoso vía loadComponent dentro de
    // auth.routes.ts, así que el bundle-splitting no se pierde.
    //
    // Antes esto se montaba como `{ path: '', loadChildren: () => import(...) }`,
    // un wrapper con path vacío igual al de Layout (abajo). Angular considera
    // una ruta con path '' COMPLETAMENTE resuelta en cuanto no quedan
    // segmentos de URL por consumir, sin importar si algún hijo hace match.
    // Para '/' (0 segmentos restantes) ese wrapper "ganaba" la resolución él
    // solo, con su outlet vacío (ninguno de sus hijos es 'auth-login' de la
    // nada), y el router nunca llegaba a intentar la rama de Layout de abajo
    // — de ahí el router-outlet completamente vacío, tanto en SSR como ya
    // hidratado en el navegador. No era un problema de guard/SSR.
    ...authRoutes,
    {
        path: '',
        title: 'Página inicial',
        component: Layout,
        canActivate: [authGuard],
        children: [
            {
                // admin.routes.ts no tiene ninguna ruta de path vacío (solo
                // admin-user-list/admin-categories-list/admin-products-list),
                // así que '/' nunca podía resolverse contra ese subárbol y el
                // router se quedaba sin ninguna ruta que hiciera match en todo
                // el árbol — de ahí el router-outlet completamente vacío tanto
                // en SSR como ya hidratado en el navegador (no era un problema
                // de SSR/guard). Redirige explícitamente a un landing real.
                path: '',
                pathMatch: 'full',
                redirectTo: 'auth-profile',
            },
            {
                path: '',
                loadChildren: () => import('./admin/admin.routes'),
            },
            {
                path: 'auth-profile',
                title: 'Perfil del usuario',
                loadComponent: () => import('./auth/profile/profile'),
            },
            {
                path: 'unauthorized',
                title: 'No autorizado',
                component: Unauthorized,
            },
            {
                path: '**',
                title: 'Página no encontrada',
                component: NotFound,
            }
        ]
    },
];
