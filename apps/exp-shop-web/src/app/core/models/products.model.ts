/**
 * El contenido anterior de este archivo estaba comentado por completo — el
 * `Product` de `@exp-shop/shared/interfaces` tampoco sirve acá, porque es un
 * DTO viejo (`{ id, name, price, description }`) que no coincide con el
 * `Product` real de GraphQL (ver product.entity.ts en el backend: title en
 * vez de name, slug, images, quantity, isActive, categoryId). Se define
 * fresco acá, igual que se hizo con `Category` en category.model.ts.
 */
export interface Product {
    id: string;
    title: string;
    price: number;
    description: string;
    images: string[];
    slug: string;
    quantity: number;
    isActive: boolean;
    categoryId: string | null;
    createdAt: string;
    updatedAt: string;
}
