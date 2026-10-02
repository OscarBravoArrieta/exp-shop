/**
 * Reemplaza la versión previa (id: number, sin isActive/timestamps) — no
 * coincidía con el `Category` real de GraphQL (ver category.entity.ts en el
 * backend: Prisma usa uuid para id, y ya se le agregó isActive para la baja
 * lógica). Se define acá, local al frontend, en vez de reusar algo de
 * `@exp-shop/shared/interfaces` porque esa lib no tiene un modelo de
 * categorías que siga el esquema real (mismo criterio que ya se usó para
 * `CreateUserInput`/`UpdateUserInput` en core/services/users.ts).
 */
export interface Category {
    id: string;
    name: string;
    image: string;
    slug: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
