# Seed de `categories` y `products`

> 10 categorías + 200 productos de prueba, generados con Prisma + `@faker-js/faker`, imágenes de [Picsum](https://picsum.photos). Verificado contra Neon y contra la API GraphQL real.

---

## Cómo correrlo

```bash
npx prisma db seed
```

Esto ejecuta `libs/backend/prisma/src/lib/seed.ts` vía `tsx` (configurado en `prisma.config.ts` → `migrations.seed`). También se dispara automáticamente después de `prisma migrate reset`.

**⚠️ Es destructivo, a propósito, solo para `categories`/`products`:** el script empieza borrando *todo* lo que haya en esas dos tablas (`deleteMany()`) antes de insertar los datos nuevos — así es idempotente, correrlo dos veces da el mismo resultado, no acumula basura. **No toca la tabla `users`** en absoluto.

---

## Qué genera

- **10 categorías** con nombres curados (Electrónica, Ropa, Hogar, Deportes, Juguetes, Libros, Belleza, Alimentos, Mascotas, Automotriz) — no aleatorios, para que el catálogo demo se vea como una tienda real. Cada una con su `image` de Picsum.
- **200 productos**, repartidos aleatoriamente entre esas 10 categorías (`faker.helpers.arrayElement`), cada uno con:
  - `title`/`description` de `faker.commerce`
  - `price` entre 5 y 500
  - `quantity` entre 0 y 200
  - `images`: array de **4** URLs de Picsum

### Imágenes: Picsum con seed determinístico

```ts
picsumUrl(seed, w, h) => `https://picsum.photos/seed/${seed}/${w}/${h}`
```

El `seed` es el `slug` (de la categoría o, para cada imagen de un producto, `slug-0`/`slug-1`/`slug-2`/`slug-3`). Esto es intencional: **la misma URL siempre devuelve la misma foto** — si vuelves a correr el seed, las imágenes no "saltan" aleatoriamente entre ejecuciones, aunque los `id` sean nuevos.

### Unicidad de `slug`

`faker.commerce.productName()` puede repetir nombres entre 200 llamadas (el pool de palabras de faker no es infinito). El slug se arma como `slugify(title)-<índice>` — el índice garantiza que nunca choque con el `@unique` de Prisma, sin importar cuántos títulos se repitan.

---

## Un problema real que apareció y cómo se resolvió

Al levantar `nx serve exp-shop-server` después de crear el seed, `nx build prisma` empezó a fallar con `TS7034/TS7005: implicitly has an 'any[]' type` sobre `const categories = []`.

**Causa:** `seed.ts` vive dentro de `libs/backend/prisma/src/lib/`, y `tsconfig.lib.json` de esa librería incluye `src/**/*.ts` — o sea, el seed pasó a formar parte del build **estricto y tipado** de la librería `prisma` (el mismo que corre `nx build`/`nx serve` de verdad), no solo de la ejecución vía `tsx` (que no tipa, solo transpila y por eso `npx prisma db seed` sí había funcionado antes de notar esto).

**Arreglo doble:**
1. Se corrigió el error real: `const categories: Category[] = [];` (tipo explícito).
2. Se excluyó `seed.ts` del build de la librería (`tsconfig.lib.json` → `"exclude": ["src/lib/seed.ts"]`) — es un script de una sola vez, no parte de la API que exporta `@org/prisma`. Así, un futuro error de tipeo en el seed nunca vuelve a bloquear el build real de la app.

---

## Verificado

- Conteo real en Postgres: `10` categorías, `200` productos, cada producto con exactamente 4 imágenes.
- Distribución por categoría razonable (15–24 productos c/u, esperable con asignación aleatoria).
- Confirmado por la API GraphQL en vivo (no solo por SQL directo): `categories { products { id } }` y `products { category { name } }` resuelven bien la relación en ambos sentidos con los datos nuevos.

---

## Pendiente / a tener en cuenta

- Como el seed hace `deleteMany()`, **no lo corras si ya tienes categorías/productos reales que quieras conservar** — hoy no distingue "datos de prueba" de "datos reales", borra todo.
- Las URLs de Picsum son solo para desarrollo/demo — cuando haya imágenes reales de producto, esa es la conversación de Cloudinary que dejamos pendiente.
