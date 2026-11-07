# Resumen de trabajo — Auth, enrutamiento, CRUD admin y catálogo

> Documento de registro de todo lo implementado en esta serie de sesiones de trabajo con Claude, desde el enrutamiento del login hasta el diseño del diálogo "Agregar al carrito". No reemplaza los docs específicos ya existentes en `docs/` (auth JWT, CRUD de usuarios/categorías/productos, etc.) — los complementa con la vista cronológica completa, los bugs reales encontrados y corregidos, y el estado de lo que quedó pendiente.

---

## 1. Login como página independiente + redirect al arrancar

**Pedido:** el login debe verse como ventana independiente (sin el header/sidebar/footer de la app), y al arrancar sin token válido debe ir directo al login.

**Archivos:** `app.routes.ts`, `auth/auth.routes.ts`, `core/guards/auth.guard.ts`, `app.config.ts`.

- `authGuard` (`CanActivateFn`): si `Auth.isAuthenticated()` es `true` deja pasar; si no, `router.createUrlTree(['/auth-login'])`. Se apoya en que `Auth.checkAuthStatus()` corre como `provideAppInitializer()` en `app.config.ts` — Angular bloquea el arranque (y la primera navegación) hasta que resuelve, así que el guard nunca lee el estado intermedio `'checking'`.
- `Layout` pasó a ser **sibling** de `auth-login`, no su padre — antes el login quedaba envuelto en el header/sidebar.

### Bug real: router-outlet completamente vacío (no era de SSR ni del guard)

Causa: Angular considera una ruta con `path: ''` **completamente resuelta** en cuanto no quedan segmentos de URL por consumir, sin importar si algún hijo hace match. Con `auth.routes` montado como `{ path: '', loadChildren: ... }` (wrapper) y `Layout` también en `path: ''`, para `/` el wrapper de `auth.routes` "ganaba" la resolución él solo (su único hijo es `auth-login`, que no matchea una URL vacía), dejando el outlet vacío sin que el router llegara a intentar la rama de `Layout`.

Confirmado con un listener temporal de `Router.events`: solo se veía `NavigationStart → RouteConfigLoadStart/End → NavigationEnd`, sin ningún `GuardsCheckStart`/`ActivationStart` — ninguna ruta llegó a activarse.

**Fix:** eliminar el wrapper — `app.routes.ts` hace `import authRoutes from './auth/auth.routes'` y `...authRoutes` directo en el array de nivel superior. `auth-login` queda con su propio path concreto, sin ambigüedad contra el `path: ''` de `Layout`. El componente `Login` sigue cargando perezoso (code-splitting intacto).

También se agregó `{ path: '', pathMatch: 'full', redirectTo: 'auth-profile' }` dentro de `Layout.children`, porque `admin.routes.ts` no tiene ninguna ruta de path vacío.

---

## 2. Bug: F5 / nueva pestaña mandaban al login con sesión válida

**Síntoma:** login y "sin token → login" funcionaban, pero refrescar el navegador o abrir en otra pestaña volvía a mandar al login aunque el token siguiera vigente en `localStorage`.

**Causa real:** `LocalStorage` (`core/services/local-storage.ts`) usa `isPlatformBrowser` y devuelve `null` en el servidor — correcto en principio, pero esto significa que `localStorage` **nunca existe en Node, bajo ningún escenario**, ni siquiera con `RenderMode.Server` "por request real". En cada F5, Angular SSR corría `checkAuthStatus()` en el servidor, que siempre veía "sin token" sin importar la sesión real del navegador, y el redirect a `/auth-login` quedaba horneado en el HTML que mandaba el servidor. La hidratación solo continuaba desde ese estado ya decidido.

**Fix:** `app.routes.server.ts` — la ruta comodín (`**`, todo lo que no sea `auth-login`) pasó de `RenderMode.Server` a `RenderMode.Client`. El servidor devuelve un shell sin evaluar rutas/guards, y `checkAuthStatus()`/`authGuard` corren únicamente en el navegador. `auth-login` sigue en `RenderMode.Prerender` (público, no depende de sesión).

**Trade-off aceptado:** las rutas protegidas ya no tienen SSR real (antes tampoco funcionaba correctamente). Si se quisiera SSR real para contenido autenticado, habría que mover el token de `localStorage` a una cookie — cambio de arquitectura no trivial, no hecho.

**Verificado:** instancia aislada (frontend+backend en puertos propios, nunca tocando las sesiones reales del usuario) con Playwright — token válido sobrevive a un F5 simulado; sin token, sigue mandando a login.

---

## 3. Panel lateral dinámico según rol

- `Layout.loggedIn` → `this.auth.isAuthenticated` (antes `signal<boolean>(true)` fijo).
- `LeftPanel.isAdmin` → `computed(() => this.auth.currentUser()?.roles.includes('admin') ?? false)` (antes también fijo en `true`). Admin ve panel de administración; cualquier otro rol ve categorías.

---

## 4. Redirect por rol tras el login

**Pedido:** rol `user` → `/dashboard`; rol `admin` → `/` (home).

**Archivo:** `auth/login/login.ts`, método `resolveHomeRoute()` llamado después de `Auth.login()`.

```ts
private resolveHomeRoute(): string {
    const roles = this.auth.currentUser()?.roles ?? [];
    return roles.includes('admin') ? '/' : '/dashboard';
}
```

**Flags:**

- Solo aplica al redirect **inmediatamente después del login**. Navegar directo a `/` (sin pasar por login) sigue cayendo en el redirect preexistente a `/auth-profile` del punto 1, sin distinguir rol — no se tocó, es una regla distinta.
- `superUser` (no mencionado en el pedido) cae en el mismo bucket que `user` → `/dashboard`, por defecto.

---

## 5. ESLint + Prettier para todo el monorepo

**Prettier:**

- Se encontró un `.prettierrc` (sin `.json`) committeado que **silenciosamente ganaba** sobre el `.prettierrc.json` nuevo del usuario, por el orden de resolución de Prettier. Se fusionó lo necesario del viejo (override de parser `angular` para `*.html`, `printWidth: 100`) y se corrigió un typo (`arrowsParents` → `arrowParens`, que no hacía nada). Se eliminó el `.prettierrc` viejo.
- `.prettierignore` ampliado: cliente de Prisma generado, directorios de config de asistentes de IA (`.agents`, `.cursor`, `.codex`, etc. — no son código del proyecto), lockfiles y `package.json` (su formato lo regenera npm).
- `prettier --write .` corrido sobre todo el proyecto.

**ESLint:**

- `eslint-config-prettier` (ya instalado, sin usar) conectado al final de `eslint.config.mjs` raíz, para que ninguna regla de estilo de ESLint compita con Prettier.
- 5 proyectos no tenían `eslint.config.mjs` en absoluto (`exp-shop-server`, `exp-shop-server-e2e`, `interfaces`, `utils`, `ui`) — **nunca se habían lintado**. Se agregaron, siguiendo el patrón ya usado en `exp-shop-web`/`prisma`.
- Lint reveló un error real preexistente: `libs/shared/ui/src/lib/ui/ui.ts` usa el selector `lib-ui` en vez de `shop-ui` (no coincide con el prefijo declarado en su `project.json`). **No se corrigió** — queda a decisión del usuario, requeriría actualizar también los templates que lo usan.

---

## 6. Backend: baja lógica (`softDelete`) en Users/Products/Categories

**Pedido:** `softDelete()` para usuarios (marca `isActive=false`, no borra el registro), `findAll` filtrando `isActive=true`. Mismo patrón para productos y categorías.

- `UsersService.softDelete()`, `ProductsService.softDelete()`, `CategoriesService.softDelete()` → `prisma.<entidad>.update({ data: { isActive: false } })`.
- `findAll()` de los tres filtra `isActive: true`. **Nota:** el pedido original solo mencionaba este filtro para usuarios — se aplicó también a productos/categorías por consistencia (si no, `softDelete` no tendría ningún efecto visible en los listados).
- `Product`/`Category` no tenían columna `isActive` (solo `User`). Se agregó vía migración real de Prisma (`libs/backend/prisma/src/lib/migrations/20261001184618_add_is_active_to_products_and_categories`), aditiva y segura.
- Mutaciones GraphQL nuevas: `softDeleteUser`, `softDeleteProduct`, `softDeleteCategory` (conviven con los `removeUser`/`removeProduct`/`removeCategory` de borrado físico ya existentes, sin reemplazarlos).

**Revisión aparte, sin cambios:** la expiración de JWT (`JWT_EXPIRATION`) ya estaba bien conectada a `signOptions.expiresIn`; `passport-jwt` la valida automáticamente. Único detalle encontrado: token expirado/malformado/ausente devuelven el mismo error genérico 401 (no se distinguen) — no se tocó porque no se pidió.

---

## 7. `UsersForm`: formulario crear/editar/ver

`users-form.ts/html/scss` (antes un stub vacío de Nx) construido completo:

- Modos `create` / `edit` / `view`, determinados por `DynamicDialogConfig.data.mode` (normalizado porque conviven distintos valores en el código que abre el diálogo).
- Validación con Signal Forms: nombre/email siempre obligatorios; contraseña obligatoria solo al crear (en edición, vacía = "no cambiarla").
- Checkboxes de roles, botón "Eliminar" en modo edición → `softDeleteUser`.
- Estilo calcado de `auth/login/login.scss` (mismos tokens de color, botón píldora).

**Bug real encontrado y corregido:** Signal Forms no permite combinar `[readonly]` manual con la directiva `[formField]` en el mismo elemento (`NG8022`). Se resolvió declarando `readonly(schemaPath.x, { when: ... })` en el propio esquema del formulario en vez de bindear el atributo a mano. Este mismo patrón de error volvió a aparecer después en `add-to-cart.html` (ver §11) — es una restricción real y recurrente de Signal Forms, no un error puntual.

4 errores de accesibilidad (`label-has-associated-control`) corregidos con pares `id`/`for`; el label de grupo "Roles" pasó de `<label>` a `<span>` porque no corresponde a un único control.

---

## 8. CRUD completo de Productos y Categorías (mismo patrón que Usuarios)

Replicado método por método a partir de `users.ts`/`users-list`/`users-form`:

- **Servicios** (`core/services/products.ts`, `categories.ts`): `getProducts`/`getProductById`/`createProduct`/`updateProduct`/`softDeleteProduct` y equivalentes de categoría. El pedido original decía `getCategorie()` (con "ie") — se interpretó como typo y se usó `getCategoryById`, consistente con el `Category` correctamente escrito en todo el resto del esquema GraphQL.
- **Modelos corregidos:** `core/models/products.model.ts` estaba completamente comentado (import roto); `category.model.ts` tenía `id: number` y le faltaban `isActive`/timestamps. Ambos reescritos para coincidir con el esquema real del backend.
- **Listas** (`products-list`, `categories-list`): `products-list.ts` ya tenía un borrador con nombres de campo que no existen en el backend real (`name`, `stock` en vez de `title`, `quantity`) — corregido. `categories-list` era un stub vacío.
- **Formularios** (`products-form`, `categories-form`): mismo esquema que `UsersForm`. El de productos incluye un `<select>` de categoría alimentado por `Categories.getCategories()`, y simplifica el arreglo `images` del backend a un solo campo de URL (no se pidió un uploader multi-imagen).

---

## 9. Acciones de fila (Ver/Editar/Eliminar) en la grilla admin

**Bug real preexistente:** `ActionButtonsCell` llamaba siempre a `DataViewerTemplate.setCurrentRecord()`, que a su vez **siempre** disparaba una confirmación de borrado genérica (`confirm2()`) sin importar qué botón se hubiera presionado — y esa confirmación tampoco borraba nada de verdad, solo mostraba un toast de ejemplo.

**Fix** (`data-viewer-template.ts`):

- `setCurrentRecord(rowData, action)` ahora despacha: `EDIT` → abre el diálogo en modo edición; `SHOW` → modo vista; `DELETE` → `confirmDelete()`.
- `confirmDelete()` pide confirmación real (nombrando el registro vía `config.describe`) y, si se acepta, llama a `config.remove(rowData)` (p. ej. `softDeleteUser`) y refresca la grilla.
- `reload()` vuelve a pedir los datos con `config.load()` y actualiza `rowData` directamente vía la API de ag-Grid, porque `dataSet` es un `input()` y el hijo no puede reasignarlo.
- Se eliminaron `confirm1`/`confirm2`, restos de tutorial sin conexión real (confirmado por grep que no se usaban en ningún otro lado).
- `UsersList.config` ganó `remove`/`describe` apuntando a `softDeleteUser` — sin esto, el botón Eliminar no hacía nada.
- Ajuste chico adicional: el botón "Nuevo" en `data-viewer-template.html` llamaba `callDialog('1', 'open')` (valores de placeholder) — cambiado a `callDialog('', 'create')`, bloqueaba probar cualquier formulario nuevo.
- `ActionButtonsCell.rowName` solo miraba `data.fullName` (tooltips de productos/categorías siempre decían "Usuario") — ahora prueba `fullName`/`title`/`name` en orden.

**Verificado con Playwright:** ver/editar/eliminar funcionan de punta a punta sobre usuarios reales en una instancia aislada (dato editado persiste, soft-delete real aplicado y excluido del listado).

---

## 10. Dashboard: scroll fijo + filtro de productos por categoría

### Scroll

**Pedido:** el título + buscador del dashboard debe quedar fijo; solo la grilla de productos debe hacer scroll.

El router-outlet (`.layout-content` en `layout.scss`) ya tenía su propio `overflow-y: auto` — pero `Dashboard` no tenía altura acotada, así que crecía libremente y el scroll real terminaba siendo el de toda la página, no el de la grilla.

**Fix:** `.dashboard` con `height: 100%; display:flex; flex-direction:column`; `.dashboard__header` con `flex-shrink:0`; `.grid-products` (clase que ya existía en el SCSS pero nunca se usaba en el HTML) con `flex:1; min-height:0; overflow-y:auto`.

**Bug real encontrado en el camino:** la clase `min-h-full` que ya traía el HTML es un utilitario real de PrimeFlex (`min-height: 100% !important`) — pisaba el `min-height: 0` necesario para que el scroll interno funcionara. Se quitó del div de la grilla.

Verificado con `getComputedStyle`: `scrollHeight > clientHeight` en la grilla (desborda su propia caja, no la página).

### Filtro por categoría

- `Products.getProducts(categoryId?)` — sin argumento devuelve todo el catálogo. Filtrado **del lado del servidor** (nuevo argumento opcional `categoryId` en la query GraphQL `products`, igual que `Users.getUsers(roles?)` ya hacía), no filtrado en el cliente.
- Nueva ruta `category/:categoryId` (mismo componente `Dashboard`, que lee el parámetro vía `ActivatedRoute.paramMap` con `toSignal`).
- `left-panel.html`: se activó el link "Todas las categorías" → `/dashboard` que ya estaba escrito pero comentado — es el mecanismo para volver a ver el catálogo completo.

---

## 11. Diseño HTML del diálogo "Agregar al carrito"

Implementado a partir de una descripción textual del diseño de claude.ai/design (no fue posible importarlo automáticamente — el MCP `claude_design` mencionado en el pedido no está conectado a este entorno; el usuario pegó el contenido textual extraído del mockup).

`add-to-cart.html` (antes un stub vacío): galería (`p-galleria`), tag de categoría + ID, título, precio, descripción, cantidad, subtotal calculado (`precio × cantidad`), botones "Agregar al carrito"/"Comprar ahora".

**Pedido explícito: "solo el diseño HTML"** — se respetó estrictamente, pero construirlo de verdad (no solo que "se viera bien") sacó a la luz **tres incompatibilidades reales de Angular/PrimeNG**, confirmadas con tres builds fallidos en secuencia, no supuestas:

1. **`p-inputnumber` no implementa la interfaz que Signal Forms necesita para `[formField]`** (`NG8002`) — PrimeNG lo integra vía `ControlValueAccessor` clásico, no vía el mecanismo nuevo de Signal Forms. Se reemplazó por un `<input type="number">` nativo (mismo patrón ya probado en `products-form.html`). Se pierden los botones visuales −/+ del diseño original; recuperarlos requeriría cablear `p-inputnumber` con `[(ngModel)]`/`ControlValueAccessor` en el `.ts`, fuera del alcance de "solo HTML".
2. **`AddToCart.ts` no tenía `FormField` en su `@Component.imports`** — requisito obligatorio de Angular para cualquier componente standalone que use esa directiva, sin excepción. Única línea tocada en ese archivo (import + entrada en el arreglo `imports`), sin agregar comportamiento nuevo.
3. **Un `min="1"` estático en el input chocaba con el validador `min()` del esquema** (mismo patrón de error que el `[readonly]` de `UsersForm`, §7) — se quitó el atributo.

También se agregaron `GalleriaModule`/`ToastModule` al `PrimeNgModule` compartido (`TagModule` ya estaba) — necesarios para que el diseño compilara, no estaban registrados.

**Hallazgo real, no introducido por este trabajo:** al probarlo con un producto real, `title`/`price` aparecen vacíos/en cero. `AddToCart.ts` nunca inyecta `DynamicDialogConfig` ni busca el producto por el `id` que le pasa `ProductDetails.addToCart()` — el modelo del formulario nunca se llena con datos reales. El HTML está bien conectado a `addToCartModel()`; falta la lógica que lo alimente (fuera de alcance de "solo HTML").

**No reproducido a propósito:** la barra superior "Exp Shop / Catálogo / carrito" del mockup — es el header global de la página (ya existe fuera de este diálogo), duplicarla adentro no tendría sentido. "Comprar ahora" se ve pero no tiene acción conectada (no se pidió un flujo de compra directa).

---

## 12. Metodología de verificación usada en todo este trabajo

Para evitar reportar "se ve bien" sin comprobarlo:

- **Nunca se tocaron las sesiones reales del usuario** (dev server en 4200, backend en 3000). Toda prueba corrió contra instancias aisladas en puertos propios (frontend 4201, backend 3099 con `CORS_ORIGIN` propio), con `environment.ts` apuntado temporalmente y revertido después.
- **Datos de prueba desechables:** usuarios/categorías/productos creados vía mutaciones reales (signup público + promoción a admin por script directo a la base con `PrismaPg`), siempre borrados al final.
- **Playwright** para flujos reales de navegador (login, abrir diálogos, llenar formularios, confirmar persistencia vía una query de seguimiento).
- Build (`nx build --skip-nx-cache`) y lint (`nx lint --skip-nx-cache`) corridos tras cada cambio no trivial, no asumidos.
- Problemas de infraestructura recurrentes identificados y resueltos: caché de TypeScript incremental obsoleta de Prisma (`dist/out-tsc/libs/backend/prisma`, causaba errores falsos de "falta `isActive`" en el build del backend — se limpia con `rm -rf` antes de cada build real), y crashes transitorios del servicio de build de esbuild/webpack (distinguibles de errores reales porque no apuntan a una línea de código).

---

## 13. Pendientes / decisiones que quedan en manos del usuario

- Verificar visualmente el flujo completo autenticado con un usuario **admin real** (no se tienen credenciales de prueba persistentes).
- `libs/shared/ui/src/lib/ui/ui.ts`: selector `lib-ui` no coincide con el prefijo `shop` del proyecto (§5) — sin corregir.
- Wiring de `AddToCart.ts` para que reciba el producto real vía `DynamicDialogConfig` (§11) — sin esto, el diálogo no muestra datos reales del producto.
- Decidir si se quiere recuperar el look de `p-inputnumber` (botones −/+) en "Agregar al carrito", lo que exige wiring adicional en TS (§11).
- "Comprar ahora" sin flujo de compra directa definido (§11).
- Si se quiere SSR real para contenido autenticado, habría que migrar el token de `localStorage` a cookie (§2) — cambio de arquitectura no trivial.
- Distinguir "sesión expirada" de "sesión inválida" en el backend requeriría tocar `JwtAuthGuard`/`handleRequest` (§6) — hoy ambos casos dan el mismo error genérico.
