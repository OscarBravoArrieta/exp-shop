import { Route } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Unauthorized } from './shared/components/unauthorized/unauthorized';
import { NotFound } from './shared/components/not-found/not-found';

export const appRoutes: Route[] = [
    {         
        path: '',
        title: 'Página inicial',
        component: Layout,
        children: [
            {
                path: '',
                loadChildren: () => import('./auth/auth.routes'),
            },
            {
                path: '',
                loadChildren: () => import('./admin/admin.routes'),
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
