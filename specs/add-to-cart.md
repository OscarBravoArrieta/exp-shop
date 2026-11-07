# Carrito de compras: persistencia en localStorage y wiring de "Agregar al carrito"

> Continúa directamente los pendientes dejados en `specs/2026-11-resumen-trabajo-frontend-admin-catalogo.md` §11/§13: el diálogo "Agregar al carrito" tenía solo el HTML y nunca llegaba a tocar ningún estado de carrito. Documenta el wiring real a `cart.store.ts`, los bugs de ese store corregidos en el camino, y la persistencia/sincronización en `localStorage`.

---

## 1. `cart.store.ts`: errores de tipos reales (no solo de estilo)

**Síntoma reportado:** error de TypeScript en las líneas 59 y 66.

**Causa real:** `Product.id` es `string` (`core/models/products.model.ts`), pero `updateQuantity(productId: number, ...)` y `removeFormCart(productId: number)` tipaban el parámetro como `number`. Las comparaciones `item.id === productId` / `item.id !== productId` comparaban `string` contra `number` — TypeScript las marca como comparación sin overlap posible. No era un problema de indentación ni de sintaxis.

**Fix:** ambos parámetros pasaron a `productId: string`.

**Typo corregido de paso:** `removeFormCart` → `removeFromCart`. No tenía callers todavía (el store nunca estuvo inyectado en ningún componente), así que el rename no rompió nada existente.

---

## 2. `cart.store.ts`: acceso a `localStorage` sin pasar por el wrapper del proyecto

**Hallazgo:** la hidratación inicial (`withState`) sí tenía guard (`'localStorage' in globalThis`), pero los cuatro métodos de escritura (`addToCart`, `updateQuantity`, `removeFormCart`, `clearCart`) tocaban `localStorage` directo, sin guard. Inconsistente con `LocalStorage` (`core/services/local-storage.ts`), el wrapper SSR-safe que ya usa `auth.ts` para persistir el token de sesión.

**Fix:** todo el store pasó a usar `inject(LocalStorage)` — tanto en la hidratación inicial como en cada mutación (`storage.getItem`/`setItem`/`removeItem`), igual que `auth.ts`. Se verificó que `inject()` funciona dentro de los factories de `withState`/`withMethods` porque corren en el contexto de inyección del propio store (se instancia vía DI, `providedIn: 'root'`).

---

## 3. Sincronización del carrito entre pestañas abiertas

**Pedido:** el carrito debe ser permanente al refrescar o abrir la app en otra pestaña.

La hidratación inicial desde `LocalStorage` ya cubre "refrescar" y "abrir en pestaña nueva" (cada pestaña lee el valor guardado al crear el store). Se confirmó además que se quería sincronización **en vivo** entre pestañas ya abiertas simultáneamente (agregar en una, verlo en la otra sin refrescar).

**Fix:** `withHooks({ onInit })` registra `window.addEventListener('storage', ...)` (con guard `typeof window === 'undefined'` para SSR). Cuando otra pestaña escribe la misma clave (`exp-shop-cart` — renombrada después de escribir este documento, antes era `pet-mart-cart`), este store recibe el evento `storage` y hace `patchState` con el valor nuevo.

---

## 4. `AddToCart.ts`: el producto real nunca llegaba al carrito

**Bugs reales encontrados:**

- `ngOnInit()` hacía `this.currentId.set(product.id)`, pero la forma real de `dynamicDialogConfig.data` es `{ product: Product }` (confirmado en `ProductDetails.addToCart()`, que abre el diálogo con `data: { product: this.product() }`) — debía ser `product.product.id`. Además, `currentId` nunca se leía en ningún otro lugar del componente ni del template: era estado muerto. Se eliminó en vez de solo corregirlo.
- `onSubmit()` solo cerraba el diálogo (`this.ref.close(this.addToCartModel())`) — nunca tocaba ningún store de carrito. El `addToCartModel` tampoco es el `Product` real (es una interfaz local de solo-display con campos que no siempre coinciden 1:1 con el dominio, p. ej. `category`, que `Product` no tiene).

**Fix:**

- Se guarda el `Product` real recibido del diálogo en un signal propio (`product = signal<Product | null>(null)`), separado del `addToCartModel` que ya existía para mostrar/editar cantidad en el template.
- `onSubmit()` ahora llama a `cartStore.addToCart(product, addToCartModel().quantity)` antes de cerrar el diálogo, usando el producto real (no el form model de display).

**No tocado, queda fuera de alcance:** `AddToCartFormModel.category` sigue sin dato real (`Product` no tiene `category`, solo `categoryId`) — el tag de categoría en el HTML queda vacío. Es un gap visual conocido, no bloquea el submit.

---

## 5. Header: badge del carrito dejó de estar hardcodeado

`header.html` ya tenía el ícono de carrito con `p-overlaybadge value="4"` — valor fijo, sin relación con ningún estado real.

**Fix:** `Header` inyecta `cartStore` (mismo patrón que usa para `Auth`) y expone `cartItemsCount = cartStore.totalItems` (computed que ya existía en el store). El binding pasó a `[value]="cartItemsCount()"`.

---

## 6. Hallazgo al verificar: presupuesto de bundle de producción

Al correr `nx build exp-shop-web` (antes nadie lo había logrado con éxito, porque el store nunca compilaba por los errores de tipos de §1) aparece un error de presupuesto: `project.json` tiene `maximumError: "1mb"` para el bundle inicial, pero el bundle real pesa 1.66 MB (PrimeNG + ag-grid + Apollo ya pesaban esto antes de este cambio). **Verificado que es preexistente y no causado por este trabajo:** se hizo `git stash` de los 4 archivos tocados acá y se corrió el mismo build sobre el código original — falla antes incluso de llegar al presupuesto, con los `TS2367` de §1. El wiring del carrito en sí agrega unas pocas líneas, nada que explique 664 KB de más. El servidor de desarrollo (`nx serve`, sin presupuesto de producción) sí compila y levanta sin errores con todos los cambios de este documento.

No se tocó `project.json` — subir el límite del presupuesto es una decisión de proyecto (afecta CI/build de producción en general), queda para que el usuario decida.

---

## 7. Pendientes / decisiones que quedan en manos del usuario

- ~~La ruta `products-in-cart` (`dashboard.routes.ts`) carga `add-to-cart.ts`...~~ **Resuelto en `specs/cart-view-checkout.md`**: la ruta ahora carga el componente `Cart` real (vista de carrito), no el diálogo `AddToCart`.
- `AddToCartFormModel.category` sigue sin dato real (§4) — si se quiere mostrar la categoría real habría que resolver `categoryId` contra `Categories.getCategoryById()` en `AddToCart.ts`, no está hecho.
- No hay flujo de "Comprar ahora" (compra directa) en el diálogo del formulario — sigue sin acción conectada. El pago con PayPal para el flujo del carrito completo (botón "Ir al pago" en la vista `Cart`) **ya está implementado y verificado**, ver `specs/cart-view-checkout.md` §6.
- ~~No se agregó UI para ver/editar/vaciar el carrito...~~ **Resuelto en `specs/cart-view-checkout.md`**: ya existe la vista `Cart` con edición de cantidad y eliminación de ítems.
