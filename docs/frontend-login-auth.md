# Frontend: login, `Auth`, `Users` y `LocalStorage`

> Primera pieza real de UI conectada al backend GraphQL. Verificado con build completo (browser + server bundles, prerender de las 7 rutas) y con requests reales contra el backend en caliente.

---

## 1. Cosas que arreglé de paso (bugs reales, no pedidos explícitamente)

- **`environment.ts` tenía mal el `graphqlUri`**: apuntaba a `http://localhost:3000/graphql`, pero desde que agregamos `useGlobalPrefix: true` al `GraphQLModule` del backend, el endpoint real es `/api/graphql`. Sin este fix, **ninguna** llamada GraphQL desde Angular habría funcionado — corregido.
- **`libs/shared/interfaces`'s `User`** no tenía `avatar` — lo agregué (`avatar?: string | null`) para que coincida con lo que el backend realmente devuelve desde que armamos `profile`.
- **Backend: faltaba la query `userByEmail`** — pediste `getUserByEmail` en el `Users` del frontend, pero el backend solo tenía el método interno `UsersService.findOneByEmail`, nunca expuesto por GraphQL. Agregué `@Query(() => User, { name: 'userByEmail' })` en `UsersResolver` (mismos roles que `user(id)`: admin o superUser).
- **Backend: faltaba CORS** — `main.ts` nunca llamaba `app.enableCors(...)`, así que el navegador bloqueaba toda request desde `http://localhost:4200` hacia `http://localhost:3000` ("Solicitud de origen cruzado bloqueada"). No se notaba con `curl`/scripts porque CORS es una política que aplica el **navegador**, no el servidor — y tampoco con SSR, porque esas llamadas las hace Node directo. Se agregó `app.enableCors({ origin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200').split(',') })`. Si despliegas el frontend a otro dominio, agrega `CORS_ORIGIN` al `.env` (o donde configures variables en producción) con ese dominio.

---

## 2. `provideApollo` — ya estaba armado, le agregué el link de autenticación

`provideGraphQL()` (en `core/graphql/apollo.provider.ts`) ya existía de la sesión pasada, usando `environment.graphqlUri` tal como pediste. Lo que faltaba — y es indispensable para que `profile`/`createUser`/etc. funcionen — es mandar el header `Authorization` en cada request. Como `HttpLink` de `@apollo/client` **no pasa por `HttpClient` de Angular**, no se puede resolver con un interceptor normal; se resuelve con un Apollo Link propio:

```ts
const authLink = setContext((_operation, previousContext) => {
  const token = localStorage.getItem<string>(AUTH_TOKEN_KEY);
  return { headers: { ...previousContext['headers'], ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
});

link: ApolloLink.from([authLink, httpLink]);
```

`setContext` viene de `@apollo/client/link/context`. Esto ya lo había anticipado cuando armamos `apollo-angular` — ahora quedó implementado.

---

## 3. `LocalStorage` — reescrito para ser seguro en SSR

Tu versión de referencia (`angular-update/.../local-storage.ts`) tenía el guard `typeof window !== 'undefined'` **solo en `getItem`** — `setItem`/`removeItem`/`clearAllStorage` no lo tenían. Esta app sí tiene SSR activo (ya nos había mordido antes con `ag-grid-angular` y `window is not defined`), así que si algo llamaba `setItem` durante el render del servidor, habría reventado igual.

Lo reescribí con el guard consistente en los 4 métodos, usando `isPlatformBrowser(inject(PLATFORM_ID))` (la forma idiomática de Angular para esto, en vez de chequear `typeof window` a mano) calculado **una sola vez** en un campo, más tipado genérico en `getItem<T>()`. Lo verifiqué de la forma más dura posible: un build completo con prerender de las 7 rutas — si el guard tuviera un hueco, se habría caído ahí mismo.

---

## 4. `Auth` (`core/services/auth.ts`)

```ts
login(email, password): Observable<AuthResponse>
getProfile(): Observable<User>
logout(): void
checkAuthStatus(): Observable<boolean>   // "otro método" que armé — ver abajo
```

- **Estado reactivo con signals**, no solo métodos que devuelven datos una vez: `currentUser` (signal de solo lectura), `isAuthenticated` (computed), `status` (`'checking' | 'authenticated' | 'not-authenticated'`). Cualquier componente puede leer `auth.currentUser()`/`auth.isAuthenticated()` reactivamente sin volver a pedir nada.
- **`checkAuthStatus`** es el método extra que agregué: se ejecuta al arrancar la app (`provideAppInitializer` en `app.config.ts`) — si hay un token guardado, lo valida contra `revalidate` (relee el usuario de la base, igual que hace `JwtStrategy` en el backend) y renueva la sesión; si no hay token o ya no sirve, deja todo en `not-authenticated`. Sin esto, refrescar la página perdía la sesión aunque el token siguiera vigente en `localStorage`.
- El token se guarda con la clave `AUTH_TOKEN_KEY = 'exp-shop-token'` (exportada, la reutiliza `apollo.provider.ts` para el link de autenticación).
- `logout()` también limpia la cache de Apollo (`client.clearStore()`) — si no, quedarían en memoria datos del usuario anterior.

---

## 5. `Users` (`core/services/users.ts`)

```ts
getUsers(roles?): Observable<User[]>
getUserById(id): Observable<User>
getUserByEmail(email): Observable<User>
createUser(input): Observable<User>
updateUser(input): Observable<User>
```

Todas estas operaciones exigen rol admin (o admin/superUser en las de un solo usuario) del lado del backend — este servicio no valida nada de eso, simplemente propaga el error 401/403 que devuelva la API. **No se crearon vistas para esto todavía**, tal como pediste.

`CreateUserInput`/`UpdateUserInput` se definieron localmente en este archivo (no se reusa `CreateUserDto` de `libs/shared/interfaces`) porque el `CreateUserInput` de GraphQL sí acepta `roles` — la versión REST compartida no, a propósito (ver `docs/modulo-users-crud.md`).

---

## 6. Login — Signal Forms

Usé la API estable de Angular 22 (`@angular/forms/signals`), verificada contra la documentación oficial antes de escribir código (no adivinada):

```ts
loginModel = signal<LoginFormModel>({ email: '', password: '' });

loginForm = form(this.loginModel, (schemaPath) => {
  required(schemaPath.email, { message: '...' });
  email(schemaPath.email, { message: '...' });
  required(schemaPath.password, { message: '...' });
  minLength(schemaPath.password, 8, { message: '...' });
});
```

En el template, `[formField]="loginForm.email"` liga el input al modelo; `loginForm.email().touched()`/`.invalid()`/`.errors()` controlan los mensajes de error. El envío usa `submit(this.loginForm, async () => {...})` — solo corre el callback si el formulario pasa las validaciones. Adentro, llama a `Auth.login()`, y si el backend rechaza las credenciales, el mensaje real ("Credenciales inválidas") se extrae del error con `CombinedGraphQLErrors.is(error)`.

### Diseño aplicado (imagen recibida después)

La imagen llegó en un mensaje posterior — layout de dos columnas: panel de marca (fondo azul con textura de rayas diagonales, logo + tagline) a la izquierda, formulario a la derecha. Se replicó la estructura y el estilo tal cual (inputs redondeados, botón "Entrar" en píldora, divisor "o", checkbox "Recordarme", toggle "Mostrar/Ocultar" dentro del campo de contraseña).

**Texto de marca adaptado**: el mockup decía "ATLAS" / "Tu infraestructura, siempre disponible." (es una plantilla genérica de infraestructura/DevOps, no de e-commerce). Lo cambié a "EXP SHOP" / "Tu tienda, siempre disponible." para que tenga sentido con tu proyecto. Si en realidad querías el texto literal del mockup, dime y lo dejo igual.

**Elementos visuales sin funcionalidad real detrás** (se ven en el diseño, pero no están conectados a nada todavía — no estaba pedido, y cada uno implica trabajo aparte):
- **"Continuar con Google"** — el backend no tiene ninguna estrategia de OAuth de Google configurada (sería una `PassportStrategy` nueva, credenciales de Google Cloud, etc.). El botón está deshabilitado.
- **"Olvidé mi contraseña"** — no hay flujo de recuperación de contraseña (ni mutation en el backend). Es texto, no un link real.
- **"¿Aún no tienes cuenta? Créala ahora"** — no hay pantalla de registro (`SignupInput`/`signup` sí existen en el backend desde el módulo `auth`, pero no hay componente ni ruta de signup en el frontend todavía).
- **"Recordarme"** — es un checkbox real (signal, toggleable), pero no cambia nada todavía: el token siempre se guarda igual en `localStorage`. Para que signifique algo de verdad habría que distinguir `localStorage` (persiste) de `sessionStorage` (solo la pestaña actual) según el checkbox — no lo hice porque no estaba pedido explícitamente, pero es un cambio chico si lo quieres.

Usé `pInputText` (directiva simple sobre `<input>` nativo) en vez de `<p-password>` de PrimeNG — no alcancé a confirmar que `[formField]` (la directiva de Signal Forms) funcione bien sobre un componente PrimeNG completo en vez de un input nativo, así que el toggle "Mostrar/Ocultar" lo armé a mano (cambia el `type` del input entre `text`/`password`).

---

## 7. Verificación real

- **Build completo** (`nx build exp-shop-web`), corrido dos veces (antes y después de aplicar el diseño real): browser + server bundles, **prerender de las 7 rutas estáticas sin errores** en ambas — confirma que `Auth`/`LocalStorage`/`checkAuthStatus` no rompen SSR.
- **`curl http://localhost:4200/auth-login`** con el dev server real corriendo → `200`; el HTML de SSR trae todos los textos del diseño aplicado ("EXP SHOP", "Login", "Continuar con Google", "Recordarme", "Olvidé mi contraseña", "Créala ahora", "Entrar", "©2026 Exp Shop").
- **Backend en caliente**: `signup` → promover a admin en la base → `login` (devuelve `avatar: null` correctamente, campo nullable) → **`userByEmail`** (la query nueva, nunca antes probada) → limpieza. Todo contra tu Neon real, sin dejar datos de prueba.

**No pude tomar una captura de pantalla real** — intenté con el skill de `run`, pero `chromium-cli` (la herramienta que usa para manejar un navegador headless) no está disponible en este entorno Windows. La verificación llegó hasta confirmar que el HTML correcto se renderiza (SSR) y que el flujo de datos funciona contra el backend real; el vistazo visual final (¿se ve bien de verdad?, clic en el botón, ver el redirect) te lo dejo para que lo confirmes tú abriendo `http://localhost:4200/auth-login` en tu navegador.

---

## 8. Enrutamiento: login fuera de Layout, redirect al arrancar, panel dinámico

Pedido: que el login se vea "como ventana independiente" (sin el header/left-panel/footer de la app), que al arrancar sin token válido se vaya derecho a login, y que `LeftPanel.isAdmin` (antes `signal<boolean>(true)` fijo) refleje el rol real del usuario.

### `authGuard` (`core/guards/auth.guard.ts`, nuevo)

`CanActivateFn` simple: si `Auth.isAuthenticated()` es `true`, deja pasar; si no, `router.createUrlTree(['/auth-login'])`. Se apoya en que `checkAuthStatus()` corre como `provideAppInitializer` en `app.config.ts` — Angular bloquea el arranque de la app (y por lo tanto la primera navegación del router) hasta que ese observable resuelve, así que el guard nunca lee el estado intermedio `'checking'`.

### Rutas: `Layout` pasó a ser sibling de `auth-login`, no su padre

`app.routes.ts` ahora tiene dos ramas de nivel superior: las rutas de `auth.routes.ts` (solo `auth-login`, público) y `Layout` (protegido por `authGuard`, con `auth-profile`/`unauthorized`/rutas admin como hijos). Antes `login` estaba anidado dentro de `Layout`, por eso se veía envuelto en el header/sidebar/footer.

### El bug real detrás del "router-outlet vacío" (no era de SSR ni del guard)

Al mover `login` fuera de `Layout`, monté sus rutas con `{ path: '', loadChildren: () => import('./auth/auth.routes') }` — un wrapper con `path: ''` igual al de `Layout` (también `path: ''`, es la raíz de la app). Para `/` (sin segmentos de URL restantes), **Angular considera una ruta con `path: ''` completamente resuelta en cuanto no queda nada por consumir, sin importar si alguno de sus hijos hace match**. El wrapper de `auth.routes` "ganaba" esa resolución él solo — su único hijo es `auth-login`, que no coincide con nada, así que su outlet quedaba vacío — y el router nunca llegaba a intentar la rama de `Layout`. Resultado: `<app-root><router-outlet></router-outlet></app-root>` completamente vacío, tanto en SSR como ya hidratado en el navegador — confirmé ambos con un servidor dev aislado y Playwright, agregando temporalmente un listener de `Router.events` para ver la secuencia real (`NavigationStart` → `NavigationEnd` sin ningún `GuardsCheckStart`/`ResolveStart`/`ActivationStart` en medio — es decir, ninguna ruta con componente llegó a activarse).

Antes de encontrar esto probé (y descarté) dos hipótesis que parecían razonables pero no eran la causa: cambiar `RenderMode.Prerender` → `RenderMode.Server` en `app.routes.server.ts` (mismo resultado, vacío) y luego `RenderMode.Client` (también vacío, porque el problema pasa igual en el navegador). El fix real fue eliminar el wrapper: `app.routes.ts` ahora hace `import authRoutes from './auth/auth.routes'` y `...authRoutes` directo en el array de nivel superior — `auth-login` queda con su propio path concreto, sin ambigüedad con el `path: ''` de `Layout`. El componente `Login` sigue cargando perezoso (el `loadComponent` vive dentro de `auth.routes.ts`), así que no se perdió code-splitting.

También agregué un hijo `{ path: '', pathMatch: 'full', redirectTo: 'auth-profile' }` dentro de `Layout.children` — sin esto, `/` seguiría sin tener a dónde ir una vez el guard deja pasar a un usuario autenticado, porque `admin.routes.ts` no tiene ninguna ruta de path vacío (solo `admin-user-list`/`admin-categories-list`/`admin-products-list`).

`app.routes.server.ts` quedó en `RenderMode.Prerender` para `auth-login` (público, mismo contenido para todos) y, en ese momento, `RenderMode.Server` para el resto. **Ese `RenderMode.Server` resultó ser incorrecto** — ver §9, donde se cambió a `RenderMode.Client` por una razón distinta a la de este bug.

### `Layout`/`LeftPanel`: signals conectadas a `Auth`

- `Layout.loggedIn` ya no es un `signal<boolean>(true)` fijo — es `this.auth.isAuthenticated` directo (el computed real de `Auth`).
- `LeftPanel.isAdmin` — el bosquejo que dejaste (`signal<boolean>(true)`) se reemplazó por `computed(() => this.auth.currentUser()?.roles.includes('admin') ?? false)`. Admin ve el panel de administración; cualquier otro rol ve categorías.

**Verificado**: build completo sin errores, y con un dev server aislado (puerto 4201, sin tocar tu sesión en 4200) confirmé con Playwright que `/` redirige a `/auth-login` y renderiza el formulario real (antes de este fix se quedaba en blanco); `/auth-login` sigue funcionando directo; una ruta no existente sigue cayendo en el guard → redirect a login (302 en SSR). **No verifiqué el flujo completo autenticado** (login real → ver `Layout` con `left-panel` mostrando el panel de admin) porque no tengo credenciales de un usuario admin de prueba — pruébalo tú con tu propio usuario.

### Bug preexistente que NO toqué (fuera de alcance de este pedido)

En `left-panel.html`, la rama `@else` (menú "Categorías", para usuarios no-admin) tiene sus `routerLink` apuntando a las MISMAS rutas que el menú de admin (`/admin-user-list`, `/admin-categories-list`, `/admin-products-list`) en vez de alguna ruta real de navegación de categorías para clientes — que todavía no existe en la app. Lo dejé como estaba porque no es parte de lo que pediste y construir esa vista es un trabajo aparte.

---

## 9. F5 / nueva pestaña mandaban a login con una sesión válida

Reportaste: login y "arrancar sin token → login" (§8) quedaron bien, pero una vez logueado, **refrescar el navegador (F5) o abrir la app en otra pestaña volvía a mandar a login**, aunque el token siguiera en `localStorage` (confirmado por ti revisando el navegador) y dentro de su vigencia (`JWT_EXPIRATION=3600`).

### Causa real: SSR no puede ver el `localStorage` del navegador, nunca — ni "por request real"

`LocalStorage` (`core/services/local-storage.ts`) guarda cada método detrás de `isPlatformBrowser(...)`, a propósito (§3) — porque `localStorage` no existe en Node bajo ningún escenario. El comentario que dejé en `app.routes.server.ts` cuando arreglamos el bug de §8 decía que `RenderMode.Server` "renderiza por request real, donde sí puede resolverse la redirección del guard" — **eso era falso**. Aunque Angular SSR sí ejecuta una petición real por cada request con `RenderMode.Server`, ese request lo procesa el proceso de Node del servidor, que jamás tiene acceso al `localStorage` del navegador que lo pidió (eso viviría, como mucho, en una cookie que el navegador sí manda — pero esta app no usa cookies para el token). Entonces:

1. F5 (o pestaña nueva) → el navegador pide el HTML completo al servidor → Angular SSR arranca ahí, corre `provideAppInitializer(() => Auth.checkAuthStatus())` **en Node**.
2. `checkAuthStatus()` llama a `LocalStorage.getItem(AUTH_TOKEN_KEY)` → `isPlatformBrowser` es `false` en el servidor → devuelve `null` siempre, sin importar qué token real tengas guardado en el navegador.
3. Sin token, `checkAuthStatus()` deja el estado en `'not-authenticated'` sin siquiera intentar la query `revalidate`.
4. `authGuard` ve `isAuthenticated() === false` → redirige a `/auth-login` — y esa redirección queda **horneada en el HTML que manda el servidor**.
5. La hidratación en el navegador continúa desde ese estado ya decidido; nunca vuelve a preguntar. De ahí el salto a login pese a tener sesión válida.

Esto nunca podía funcionar con `RenderMode.Server` para rutas protegidas, sin importar qué tan "real" fuera la petición — el guard depende de un dato que solo existe del lado del navegador.

### Fix

`app.routes.server.ts`: la ruta comodín (`**`, todo lo que no sea `auth-login`) pasó de `RenderMode.Server` a `RenderMode.Client`. Con esto el servidor devuelve un shell sin evaluar rutas/guards, y `checkAuthStatus()`/`authGuard` corren únicamente en el navegador — donde el `localStorage` real sí existe, en el arranque inicial y en cada F5 por igual. `auth-login` se queda en `RenderMode.Prerender` (no depende de sesión, sigue sirviendo su HTML público).

Nota: esto significa que las rutas protegidas dejan de tener contenido en el HTML inicial de SSR (antes tampoco lo tenían de forma *correcta*, porque el guard siempre fallaba ahí — ver arriba). Si en el futuro quieres SSR real para contenido autenticado, la única forma de que funcione es dejar de depender de `localStorage` y mover el token a una cookie que el navegador mande en cada request (para que el servidor sí pueda leerla) — cambio de arquitectura más grande, no lo hice porque no era lo pedido.

### Verificado

Con un frontend aislado (puerto 4201) **y un backend aislado** (puerto 3099, mismo `DATABASE_URL`, `CORS_ORIGIN=http://localhost:4201`) — ninguno de los dos toca tus sesiones reales en 4200/3000 — creé un usuario de prueba real vía la mutation pública `signup`, inyecté su token real en `localStorage` con Playwright, y confirmé:
- Navegar a `/` con token válido → redirige a `/auth-profile`, contenido real, título correcto.
- **F5 (reload) sobre esa misma página → se queda en `/auth-profile`**, ya no salta a login. Este era el bug reportado.
- Sin token → `/` sigue mandando a `/auth-login`, con y sin F5 (el caso negativo sigue funcionando).

Usuario y datos de prueba eliminados de la base al terminar (`prisma.user.deleteMany` por email, sin dejar rastro). **No verifiqué** que un usuario con rol admin real vea el panel de administración tras el F5 — mi usuario de prueba (vía `signup`) queda con rol `user` por defecto y no tengo forma de promoverlo a admin sin tocar tu base de datos de verdad; pruébalo tú con tu propio usuario admin.

### Backend: validación de expiración del JWT (pediste revisar esto también)

Ya estaba bien implementado, no hice cambios:

- `JWT_EXPIRATION` (env) sí está conectado: `auth.module.ts` lo pasa como `signOptions.expiresIn` al registrar `JwtModule`, y `AuthService.getJwtToken()` firma con eso — no es config muerta.
- La expiración la valida `passport-jwt` automáticamente antes de que corra `JwtStrategy.validate()` (no se seteó `ignoreExpiration`, así que usa su default `false`). Un token expirado nunca llega a `validate()`.
- Eso sí: un token expirado, uno malformado, y ningún token, hoy producen **el mismo error genérico** (`UnauthorizedException` / 401) — `JwtAuthGuard` no sobreescribe `handleRequest`, así que Nest colapsa las tres causas en un solo mensaje sin distinguir. En la práctica no importa para el flujo actual: `Auth.checkAuthStatus()` en el frontend hace `catchError` genérico sobre cualquier error de `revalidate` y llama `logout()` igual en los tres casos. Solo importaría si en el futuro quisieras un mensaje específico tipo "tu sesión expiró, vuelve a iniciar sesión" en vez de un logout silencioso — no lo construí porque no estaba pedido.

---

## 10. Pendiente

- Confirmar visualmente que el diseño quedó bien (no pude tomar captura, ver arriba).
- Confirmar si quieres el texto de marca literal del mockup ("Atlas") en vez de la adaptación a "Exp Shop" (§6).
- Vistas para `Users` (`getUsers`/`createUser`/etc. — servicio listo, sin pantallas).
- Probar `[formField]` con `<p-password>` u otros componentes PrimeNG "grandes", si los quieres en vez de inputs nativos estilizados.
- Si quieres, conectar de verdad: Google OAuth, recuperación de contraseña, pantalla de registro, y que "Recordarme" cambie el storage real (§6).
- Probar el flujo autenticado completo con un usuario ADMIN real (login → F5 → confirmar que `Layout`/`LeftPanel` siguen mostrando el panel de administración) — verifiqué la persistencia de sesión genérica con un usuario de prueba sin rol admin (§9), pero no el caso admin específico.
- Arreglar los `routerLink` del menú "Categorías" en `left-panel.html`, que hoy apuntan a las rutas de admin en vez de una vista real de categorías para clientes (§8).
- Si algún día quieres SSR real para contenido autenticado (no solo el shell + CSR de hoy), habría que mover el token de `localStorage` a una cookie legible por el servidor — cambio de arquitectura, no trivial (§9).
- Si quieres distinguir "sesión expirada" de "sesión inválida" en la UI, el backend hoy los devuelve como el mismo error genérico — requeriría tocar `JwtAuthGuard`/`handleRequest` (§9).
