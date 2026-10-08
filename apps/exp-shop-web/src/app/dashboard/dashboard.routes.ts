import { Routes } from '@angular/router';


 export default [
     {
         path: 'dashboard',
         title: 'Gestionando la tienda',
         loadComponent: () => import ('../../app/dashboard/dashboard/dashboard'),
     },
     {
         // Mismo componente que 'dashboard' — lee :categoryId de la ruta
         // para filtrar (ver Dashboard). Lo usa left-panel.html al listar categorías.
         path: 'category/:categoryId',
         title: 'Categoría',
         loadComponent: () => import ('../../app/dashboard/dashboard/dashboard'),
     },
     {
         path: 'products-in-cart',
         title: 'Productos en el carrito',
         loadComponent: () => import ('../../app/dashboard/add-to-cart/add-to-cart'),
     }
 ] as Routes
