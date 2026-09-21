import { Routes } from '@angular/router';

export default [
    {
        path: 'auth-login',
        title: 'Control de acceso',
        loadComponent: () => import('../auth/login/login'),
    },
    {
        path: 'auth-profile',
        title: 'Perfil del usuario',
        loadComponent: () => import('../auth/profile/profile'),
    },
] as Routes;
