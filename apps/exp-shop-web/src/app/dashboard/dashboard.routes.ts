import { Routes } from '@angular/router';


 export default [
     {         
         path: 'dashboard',
         title: 'Gestionando la tienda',
         loadComponent: () => import ('../../app/dashboard/dashboard/dashboard'),
     },
     {    
         path: 'products-in-cart',
         title: 'Productos en el carrito',
         loadComponent: () => import ('../../app/dashboard/add-to-cart/add-to-cart'),
     }
 ] as Routes
