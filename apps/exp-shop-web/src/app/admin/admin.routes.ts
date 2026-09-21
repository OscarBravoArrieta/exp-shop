import { Routes } from '@angular/router';

export default [
    {
        path: 'admin-user-list',
        title: 'Administración de usuarios',
        loadComponent: () => import('../admin/users/users-list/users-list'),
    },
    {
        path: 'admin-categories-list',
        title: 'Administración de categorías',
        loadComponent: () => import('../admin/categories/categories-list/categories-list'),
    },
    {
        path: 'admin-products-list',
        title: 'Administración de productos',
        loadComponent: () => import('../admin/products/products-list/products-list'),
    },
] as Routes;
