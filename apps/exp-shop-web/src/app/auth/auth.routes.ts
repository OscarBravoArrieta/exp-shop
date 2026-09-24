import { Routes } from '@angular/router';

/**
 * Solo rutas públicas, pre-sesión. `auth-profile` se movió a app.routes.ts,
 * dentro del árbol protegido por Layout + authGuard — ver el pedido de que
 * el login se muestre "fuera de la ventana principal de la aplicación".
 */
export default [
    {
        path: 'auth-login',
        title: 'Control de acceso',
        loadComponent: () => import('../auth/login/login'),
    },
] as Routes;
