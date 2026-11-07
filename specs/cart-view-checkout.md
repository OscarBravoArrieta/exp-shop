# Vista del carrito (`Cart`), confirmación de borrado y pago real con PayPal

> Continúa `specs/add-to-cart.md`: con "Agregar al carrito" ya funcional, faltaba la vista donde el usuario ve/edita/paga lo que agregó. Documenta la implementación de `Cart`, dos bugs de routing/navegación encontrados en el camino, la decisión de omitir envío estimado, la confirmación al eliminar un ítem, y la integración real (no solo diseño) con PayPal.

---

## 1. `Cart`: de stub vacío a vista real

**Hallazgo:** `shared/components/cart/` ya existía, pero era el scaffold por defecto de Angular CLI (`<p>cart works!</p>`, sin lógica, sin inyectar `cartStore`, no referenciado en ninguna ruta).

**Archivos:** `shared/components/cart/cart.ts`, `cart.html`, `cart.scss`.

- `Cart` inyecta `cartStore` y expone `items`/`totalAmount` (signals del store) y un `summaryLabel` computado ("N artículos · M productos").
- `onQuantityChange(productId, value)`: aplica el mismo criterio de validación que el mockup de referencia (`Math.max(1, Math.min(99, ...))`) y llama `cartStore.updateQuantity`.
- `onRemove(item)`: ver §5 (ahora pide confirmación antes de borrar).
- Estado vacío (`items().length === 0`): bloque centrado con PrimeFlex, ícono `shopping-cart` ya registrado en `PrimeNgModule`, texto "No ha seleccionado productos" y botón "Ver catálogo" (`router.navigate(['/dashboard'])`).
- Estado con productos: tabla HTML nativa (el proyecto no usa `p-table` en ningún otro lado — confirmado por grep antes de implementar, 0 resultados) con imagen/título, cantidad editable (`pInputText`, mismo patrón que `add-to-cart.html`), precio unitario, total de línea y botón de eliminar. Panel lateral de resumen con Subtotal/Total y botón "Ir al pago".
- Estilos: clases BEM `cart__*` reutilizando los mismos tokens de marca que `add-to-cart.scss`/`users-form.scss`/`login.scss` (`$brand-blue`, `$brand-blue-dark`, `$text-muted`, `$border-color`), no las CSS custom properties del mockup "Cobalto" original.

**Decisión explícita, no fabricar datos:** el mockup de referencia incluía badges de "estado de stock" (`En stock` / `Sale en 2–3 semanas`) y categoría por producto — ninguno de los dos existe en el `Product` real (`core/models/products.model.ts`, solo tiene `isActive`/`categoryId`), así que no se incluyeron en la tabla.

---

## 2. Decisión: sin envío estimado en el resumen

El mockup de referencia incluía una línea fija de "Envío estimado" (ej. `$6.94`). No existe ninguna regla real de envío en el backend. Se decidió **omitirla** — el resumen muestra Subtotal y el total grande (mismo valor), con una nota "Los impuestos y el envío se calculan en el siguiente paso" en vez de inventar un monto.

---

## 3. Bug real encontrado: la ruta `products-in-cart` cargaba el componente equivocado

Ya documentado como pendiente en `specs/add-to-cart.md` §7: `dashboard.routes.ts` tenía `path: 'products-in-cart'` apuntando a `dashboard/add-to-cart/add-to-cart` (el diálogo de formulario, pensado para abrirse como modal vía `DialogService`), no a una vista de carrito.

**Fix:** la ruta ahora carga `shared/components/cart/cart` (`export default class Cart`, mismo patrón que `Dashboard`).

---

## 4. Bug real encontrado: `routerLink` en el header no navegaba

Al conectar el ícono del carrito del header a `/products-in-cart`, se encontró que el logo (`<p-image routerLink="/">`, `header.html`) **ya usaba `routerLink` sin que la directiva `RouterLink` estuviera en los `imports` del componente standalone `Header`** — es decir, ese enlace nunca navegó realmente, era un atributo inerte.

**Fix:** se agregó `RouterLink` (de `@angular/router`) a `Header.imports`, lo que corrige el logo de paso, y se envolvió el ícono del carrito en un `<div routerLink="/products-in-cart" class="cursor-pointer">`.

---

## 5. Confirmación al eliminar un producto del carrito

**Pedido:** pedir confirmación antes de eliminar (mismo patrón que `confirmDelete()` de `data-viewer-template.ts`, único lugar del proyecto que ya usaba `ConfirmationService`) y mostrar un toast "Se eliminó el producto." al confirmar.

**Archivos:** `cart.ts`, `cart.html`.

- Se agregó `ConfirmationService` a `providers` (junto a `MessageService`) y `<p-confirmdialog />` al template.
- `onRemove(item: CartItem)` (antes recibía solo `productId`, ahora el ítem completo porque el mensaje necesita `item.title`) llama a `confirmationService.confirm({...})` con el mismo estilo que `data-viewer-template.ts`: `header: 'Confirmar eliminación'`, `icon: 'pi pi-exclamation-triangle'`, `acceptButtonProps: { label: 'Eliminar', severity: 'danger' }`, `rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true }`, `message: `¿Deseas eliminar "${item.title}" del carrito?``.
- En `accept`: `cartStore.removeFromCart(item.id)` + toast `{ severity: 'success', summary: 'Listo', detail: 'Se eliminó el producto.' }` (texto exacto pedido).
- `CartItem` pasó a exportarse desde `cart.store.ts` (antes era un `type` local sin `export`) para poder tiparlo en `Cart.onRemove`.

**Ícono del botón de eliminar:** se pidió copiar el de `categories-form.html`, pero ese botón **no tiene ningún ícono** (es solo texto "Eliminar", `pButton severity="danger"`, sin `<svg>`). Se confirmó con el usuario que el ícono real buscado era el de `ActionButtonsCell` (grillas admin) para la acción de eliminar: `pButton iconOnly rounded severity="danger" variant="outlined"` con `<svg data-p-icon="minus-circle">`. Se reemplazó el botón anterior (`delete-left`, con texto oculto vía `[text]="true"`) por ese mismo estilo.

---

## 6. Integración real con PayPal (ya no es solo diseño)

Lo documentado antes en esta sección era una propuesta sin implementar. Ahora está implementado:

**Archivos nuevos:**

- `core/models/paypal.model.ts`: tipado mínimo de `window.paypal` (solo `Buttons({ createOrder, onApprove, onError }).render(...)`, no el SDK completo) + `declare global { interface Window { paypal?: PayPalNamespace } }`. Primera declaración de tipos globales del proyecto (no existía ningún `.d.ts`/`declare global` antes).
- `core/services/paypal-sdk-loader.ts`: `PaypalSdkLoader`, `providedIn: 'root'`, método `load(clientId): Promise<PayPalNamespace>`. Cachea la promesa (no inyecta el script dos veces) y usa `isPlatformBrowser(inject(PLATFORM_ID))` — mismo patrón que `LocalStorage` — para no tocar el DOM si se llamara en SSR. Primer precedente del proyecto de `document.createElement('script')` para cargar un script externo dinámicamente.

**`cart.ts`:**

- `checkoutStarted` (signal) + `paypalContainer` (`viewChild` de un `<div #paypalContainer>`). Un `effect()` en el constructor espera a que ambos estén listos y entonces llama a `paypalSdkLoader.load(environment.clientId)` y renderiza `paypal.Buttons({...}).render(container.nativeElement)` — una sola vez (`paypalButtonsRendered` evita re-renderizar en cada cambio de signal).
- `onCheckout()` ahora solo hace `checkoutStarted.set(true)` (antes mostraba el toast "Pago en construcción").
- `createOrder`: `actions.order.create({ purchase_units: [{ amount: { value: totalAmount().toFixed(2) } }] })`. **Moneda `USD` fija** — no hay ninguna configuración de moneda en el proyecto, se asumió por ser la moneda implícita en el resto de la UI (`| currency` sin configurar).
- `onApprove`: `actions.order.capture()` y, al resolver: `cartStore.clearCart()`, toast de éxito ("Pago completado, gracias por tu compra."), `router.navigate(['/dashboard'])`. **Decisión explícita del usuario:** sin pantalla de confirmación dedicada en esta tarea — se reutiliza el dashboard existente.
- `onError`: toast de error y vuelve a `checkoutStarted.set(false)` para permitir reintentar.
- `cart.html`: mientras `!checkoutStarted()` se ve el botón "Ir al pago"; al hacer clic se reemplaza por el contenedor de los botones reales de PayPal + un botón "Cancelar" para volver atrás.

**Riesgo real explícito, no resuelto:** el monto enviado a PayPal en `createOrder` lo arma el cliente a partir de `cartStore.totalAmount()` — nada impide que alguien manipule ese valor en el navegador antes de pagar. Es aceptable para una primera versión en sandbox, pero **antes de usar esto con dinero real** hace falta un endpoint backend que cree/verifique la orden contra la API de PayPal con la llave secreta, no solo confiar en el monto que llega del cliente.

**Verificado:** el usuario probó el flujo completo en el navegador (agregar producto, editar cantidad, eliminar con confirmación, pagar con el sandbox real de PayPal usando el `clientId` de `environment.ts`) y confirmó que todo funciona de punta a punta.

### 6.1. Bug real encontrado al diagnosticar "no veo el movimiento en PayPal"

**Síntoma reportado:** tras un pago de prueba exitoso en la UI (toast + carrito vacío), el usuario no encontraba la transacción en "Movimientos" de la cuenta sandbox receptora, filtrando por `Estado: Pagos entrantes para revisión`.

**Bug real en el código, encontrado en el camino (no la causa del síntoma, pero sí un hallazgo real):** `onApprove` daba por exitoso cualquier pago apenas la promesa de `capture()` se resolvía, **sin revisar el campo `status` de la respuesta** (podía ser `COMPLETED`, pero también `PENDING` u otro estado sin que el código lo distinguiera). Además `onError` ignoraba por completo el parámetro `error` — si algo fallaba, no quedaba ningún rastro en consola.

**Fix:** `onApprove` ahora hace `console.log('PayPal capture response:', details)` y solo vacía el carrito / muestra éxito si `details.status === 'COMPLETED'`; cualquier otro estado muestra un aviso "Pago en revisión" sin tocar el carrito. `onError` ahora hace `console.error('PayPal onError:', error)`. Tipos actualizados en `paypal.model.ts` (`PayPalCaptureDetails` con `status: string`).

**Causa real del síntoma original (confirmada con el log de consola):** no era un bug — el pago sí se había completado. El log mostró una respuesta real de PayPal sandbox: `id: "38F630157Y9342933"`, `status: "COMPLETED"`, `payer.email_address` real, link a `api.sandbox.paypal.com/v2/checkout/orders/...`. El filtro `Estado: Pagos entrantes para revisión` en la UI de paypal.com es específico para pagos **retenidos para revisión manual** — un pago `COMPLETED` normal nunca aparece ahí. Quitando ese filtro (o cambiándolo a "Completado"), la transacción aparece.

---

## 7. Pendientes / decisiones que quedan en manos del usuario

- Validación server-side del monto antes de capturar el pago (ver riesgo explícito en §6) — requeriría el primer módulo de pagos en el backend NestJS.
- Pantalla de confirmación de compra dedicada (hoy se redirige al dashboard con un toast, por decisión explícita del usuario).
- El badge de "estado de stock" del mockup original no tiene campo real equivalente en `Product` — si se quiere mostrarlo habría que decidir qué regla de negocio lo determina (¿`quantity` del producto en inventario, actualmente reutilizado también como "cantidad en el carrito" en `CartItem = Product & { quantity: number }`? Ese choque de nombres ya existe en `cart.store.ts` y no se tocó).
- No se agregó un lugar visual para mostrar errores de red/carga en `Cart` (ej. si `item.images` viene vacío, el `<img>` queda roto) — mismo nivel de robustez que ya tiene `add-to-cart.html` con `p-galleria`, no se fue más allá.
