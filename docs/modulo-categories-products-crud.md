# Módulos `categories` y `products` — CRUD completo (NestJS + Prisma + GraphQL)

> Mismo patrón que `docs/modulo-users-crud.md` (entity, DTOs, service, resolver), con una diferencia deliberada en autorización: acá la **lectura es pública**. Verificado end-to-end contra Neon.

---

## 1. Archivos creados

```
apps/exp-shop-server/src/app/
├── common/
│   └── handle-prisma-error.util.ts   ← nuevo, compartido por los 3 módulos (ver §2)
├── categories/
│   ├── category.entity.ts
│   ├── categories.module.ts
│   ├── categories.resolver.ts
│   ├── categories.service.ts
│   └── dto/
│       ├── create-category.input.ts
│       └── update-category.input.ts
└── products/
    ├── product.entity.ts
    ├── products.module.ts
    ├── products.resolver.ts
    ├── products.service.ts
    └── dto/
        ├── create-product.input.ts
        └── update-product.input.ts
```

Registrados en `AppModule`. `users.service.ts` se retocó para usar el helper nuevo (ver abajo).

---

## 2. Refactor: `handlePrismaError` compartido

`UsersService` ya tenía un método privado `handleDbErrors` que traduce `P2002`/`P2025` de Prisma a excepciones legibles. Al construir `CategoriesService`/`ProductsService` esa misma lógica se iba a triplicar tal cual — se extrajo a `apps/exp-shop-server/src/app/common/handle-prisma-error.util.ts`, una función pura (no un servicio inyectable, no hace falta) que recibe el error, un `Logger` y una etiqueta en español para el mensaje:

```ts
handlePrismaError(error, this.logger, 'un producto');
// → BadRequestException / NotFoundException / InternalServerErrorException, según el código
```

Los tres servicios (`users`, `categories`, `products`) ahora usan la misma función. Este es el único punto donde el andamiaje de `categories`/`products` **no** replica literalmente el patrón de `users` — lo mejora, porque `users` fue el primero y no había necesidad de compartir nada todavía.

---

## 3. Decisión de autorización: lectura pública, escritura admin

`UsersResolver` protege **todo** (tiene sentido: la lista de usuarios no es un dato público). Para `categories`/`products` eso no tendría sentido — es el catálogo de una tienda, se supone que cualquiera lo navega sin loguearse. Por eso:

| Operación | Guard |
|---|---|
| `categories`, `category`, `products`, `product` | **Ninguno** — públicas |
| `createCategory`, `updateCategory`, `removeCategory` | `@UseGuards(JwtAuthGuard)` + `@CurrentUser([ValidRoles.admin])` |
| `createProduct`, `updateProduct`, `removeProduct` | `@UseGuards(JwtAuthGuard)` + `@CurrentUser([ValidRoles.admin])` |

A diferencia de `UsersResolver` (guard a nivel de **clase**), acá el `@UseGuards(JwtAuthGuard)` va **por método**, solo en las mutations — si se pusiera a nivel de clase, las queries de lectura también quedarían bloqueadas.

Si en realidad querías que todo el catálogo también fuera privado (mismo criterio que `users`), es un cambio de una línea por resolver (mover el `@UseGuards` a la clase) — avísame y lo ajusto.

---

## 4. La relación `Category ↔ Product` en GraphQL

Prisma ya modela la relación (`Product.categoryId` + `Product.category` ↔ `Category.products`), pero eso no se traduce solo al schema de GraphQL. Cada lado se resuelve con `@ResolveField()`:

```ts
// ProductsResolver
@ResolveField(() => Category, { nullable: true })
category(@Parent() product: Product) {
  if (!product.categoryId) return Promise.resolve(null);
  return this.productsService.findCategoryOf(product.categoryId);
}

// CategoriesResolver
@ResolveField(() => [Product])
products(@Parent() category: Category) {
  return this.categoriesService.findProductsByCategory(category.id);
}
```

**Decisión clave para evitar una dependencia circular de módulos:** `ProductsService.findCategoryOf` consulta `this.prisma.category` directamente (no inyecta `CategoriesService`), y viceversa. Si en cambio `ProductsModule` importara `CategoriesModule` para inyectar `CategoriesService` (y `CategoriesModule` hiciera lo mismo al revés para `products`), sería una dependencia circular de módulos de Nest — resoluble con `forwardRef()`, pero innecesario acá: como `PrismaService` ya es global y unifica todos los modelos, cada servicio puede tocar cualquier tabla sin necesitar el servicio del otro módulo. `CategoriesModule` y `ProductsModule` no se importan entre sí.

Las dos entidades (`category.entity.ts` y `product.entity.ts`) también se importan una a la otra (`Category` referencia `Product` y viceversa) — esto funciona sin problema porque `@Field(() => Product)` es un *thunk* (una función, no la clase directamente): no se ejecuta hasta que se leen los metadatos de GraphQL, momento en el que ambos módulos ya están completamente cargados. Es el patrón estándar de NestJS+GraphQL para relaciones bidireccionales.

---

## 5. Sobre los `slug`

`CreateCategoryInput`/`CreateProductInput` exigen `slug` como campo explícito (no se auto-genera desde `name`/`title`) — mismo criterio que `users`: todos los campos van explícitos en el DTO, sin lógica derivada escondida. Se valida con una regex (`^[a-z0-9]+(-[a-z0-9]+)*$`) para evitar slugs con mayúsculas, espacios o caracteres raros; si más adelante quieres auto-generarlo a partir del título cuando no venga, es un cambio pequeño en el service (`create`).

---

## 6. Un problema real que apareció al verificar (y cómo se resolvió)

Al levantar el servidor para probar esto, `nx build exp-shop-server` falló con `TS6305: Output file ... has not been built from source file` sobre los imports de `@exp-shop/shared/interfaces` y `@org/prisma`, y en cascada un `TS18046: 'error' is of type 'unknown'` en el helper nuevo.

**Causa:** en verificaciones anteriores había estado corriendo `rm -rf dist/out-tsc` antes de cada `tsc -b` manual mío — seguro para mis propias corridas aisladas, pero `nx build`/`nx serve` de verdad **depende** de que `dist/out-tsc/libs/shared/interfaces` y `dist/out-tsc/libs/backend/prisma` ya tengan los `.d.ts` generados por las tareas `interfaces:build`/`prisma:build`. Nx tenía esas dos tareas marcadas como "cacheadas" (creía que ya estaban hechas) pero yo había borrado los archivos físicos por fuera de su control — Nx y el disco quedaron desincronizados. El `TS18046` era un síntoma en cascada: al no poder resolver el tipo de `Prisma` (por el mismo motivo), TypeScript no podía angostar `error` dentro del `instanceof`.

**Arreglo:** `nx run-many -t build --projects=interfaces,prisma --skip-nx-cache` para forzar que Nx regenerara los archivos de verdad, ignorando su caché desincronizada. Con eso, `nx build`/`nx serve` volvieron a funcionar. **Lección para el futuro:** no borrar `dist/out-tsc` a mano cuando haya corridas de `nx build`/`nx serve` de por medio — si hace falta limpiar, usar `nx reset` (que también invalida la caché de Nx, no solo el disco) en vez de borrar la carpeta directamente.

---

## 7. Verificación real contra Neon

1. `categories`/`products` **sin token** → responden (lectura pública confirmada). ✅
2. `createProduct` **sin token** → `401 Unauthorized`. ✅
3. Con un admin (promovido a mano en la base, mismo procedimiento que en `docs/modulo-auth-jwt.md`): `createCategory` → `createProduct` con `categoryId` → la respuesta trae `category { id, name }` anidada, resuelta por el `@ResolveField`. ✅
4. `categories { products { id title } }` (sentido inverso) → devuelve el producto dentro de su categoría. ✅
5. `updateProduct` (cambiar `quantity`) → aplica. ✅
6. `removeCategory` → la categoría se borra; el producto asociado **sigue existiendo**, con `categoryId: null` y `category: null` — confirma que el `ON DELETE SET NULL` de la migración funciona de verdad, no solo en el papel. ✅
7. Limpieza completa (`removeProduct`, `removeUser` del admin de prueba) — la base quedó en `0` categorías, `0` productos, y exactamente los usuarios reales que ya tenías. ✅

---

## 8. Pendientes / siguientes pasos naturales

- Si quieres que la lectura de `categories`/`products` también sea privada, es un cambio de una línea (§3).
- Auto-generar `slug` desde `name`/`title` cuando no venga (§5) — no implementado, no estaba pedido.
- Paginación/filtros en `products`/`categories` (hoy `findAll` trae todo sin límite) — para un catálogo real vale la pena antes de tener muchos productos.
- Conectar esto en el frontend con `apollo-angular`, reemplazando el placeholder de `AgGridAngular` en `admin/products/products-list` por datos reales de la query `products`.
