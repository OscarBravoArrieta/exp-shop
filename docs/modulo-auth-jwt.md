# Módulo `auth` — JWT + Passport + GraphQL

> Construido en `apps/exp-shop-server/src/app/auth/`, siguiendo el patrón analizado en `docs/analisis-auth-users-nest-anylist.md` (proyecto `nest-anylist`, TypeORM), adaptado a Prisma. Cierra el hueco de seguridad que había quedado documentado en `docs/modulo-users-crud.md` §2.4: `UsersResolver` ya no es público.

---

## 1. Archivos creados

```
apps/exp-shop-server/src/app/auth/
├── auth.module.ts
├── auth.resolver.ts
├── auth.service.ts
├── decorators/
│   └── current-user.decorator.ts
├── dto/inputs/
│   ├── index.ts
│   ├── login.input.ts
│   └── signup.input.ts
├── enums/
│   └── valid-roles.enum.ts
├── guards/
│   └── jwt-auth.guard.ts
├── interfaces/
│   └── jwt-payload.interface.ts
├── strategies/
│   └── jwt.strategy.ts
└── types/
    └── auth-response.type.ts
```

Retocados (para cerrar el círculo con `auth`):

- `apps/exp-shop-server/src/app/app.module.ts` → `ConfigModule.forRoot()` + `AuthModule`.
- `apps/exp-shop-server/src/app/users/user.entity.ts` → `roles` ahora tipa contra `[ValidRoles]` en vez de `[String]`.
- `apps/exp-shop-server/src/app/users/dto/create-user.input.ts` → `roles` valida con `@IsEnum(ValidRoles, { each: true })`.
- `apps/exp-shop-server/src/app/users/users.resolver.ts` → `@UseGuards(JwtAuthGuard)` a nivel de clase + `@CurrentUser([roles])` por método.
- `.env` → se agregaron `JWT_SECRET` y `JWT_EXPIRATION` (no existían).

---

## 2. Instalado

```
npm install --save @nestjs/jwt @nestjs/passport passport passport-jwt @nestjs/config
npm install --save-dev @types/passport-jwt
```

Todo compatible con NestJS 11 (verificado contra el registro de npm antes de instalar — `@nestjs/jwt@12.0.2`, `@nestjs/passport@12.0.0`, `passport-jwt@4.0.1` declaran soporte explícito para `@nestjs/common: ^11.0.0`).

---

## 3. ⚠️ `JWT_SECRET` — acción pendiente tuya

Agregué al `.env` exactamente lo que me diste:

```
JWT_SECRET=TypeHere_YourJWTSecretKeyHere
JWT_EXPIRATION=3600
```

**`TypeHere_YourJWTSecretKeyHere` es un placeholder de tutorial, no un secreto real.** Cualquiera que lo reconozca (es un valor de ejemplo público, común en guías de NestJS) puede firmar tokens válidos para tu API. Antes de que esto vea producción — o incluso antes de compartir este repo — reemplázalo por una cadena aleatoria larga, por ejemplo:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

`.env` ya está en `.gitignore` (lo confirmamos hace unas sesiones), así que el valor no se va a commitear — pero el placeholder sigue siendo débil localmente. Dime si quieres que lo genere y lo reemplace ahora mismo.

---

## 4. Decisiones de diseño

### 4.1 `SignupInput` (auth) vs `CreateUserInput` (users) — no son lo mismo a propósito

`SignupInput` tiene `fullName`, `email`, `password` — **sin `roles`**. `CreateUserInput` (el que ya existía en `users/dto/`) sí permite pasar `roles`. La diferencia es intencional y por seguridad: alguien que se autorregistra (`signup`, público, sin guard) nunca debe poder auto-asignarse `admin`; solo un admin autenticado usando `createUser` (protegido, exige rol `admin`) puede asignar roles. `AuthService.signup` reusa `UsersService.create(signupInput)` directamente — no duplica lógica de creación, solo restringe qué campos puede mandar quien no está autenticado todavía.

### 4.2 `ValidRoles` ahora se usa de punta a punta

El enum (idéntico en valores al de `nest-anylist`: `admin`, `user`, `superUser`) se conectó en los tres puntos donde importa:
- **Entrada**: `CreateUserInput.roles` valida con `@IsEnum(ValidRoles, { each: true })` — ya no se puede mandar un string arbitrario como rol.
- **Salida**: `User.roles` en GraphQL tipa `[ValidRoles]` — el schema documenta los valores posibles, no un `[String]` genérico.
- **Autorización**: `@CurrentUser([ValidRoles.admin])` en los resolvers.

Prisma sigue guardando `roles` como `String[]` a nivel de columna (no hay enum nativo en el schema) — el enum vive enteramente en la capa de aplicación, igual que en el proyecto de referencia.

### 4.3 Qué quedó protegido y con qué rol

`UsersResolver` tiene `@UseGuards(JwtAuthGuard)` a nivel de clase (nada funciona sin un JWT válido), y encima cada método exige un rol puntual:

| Operación | Rol requerido |
|---|---|
| `users` (listar) | `admin` |
| `user` (uno por id) | `admin` o `superUser` |
| `createUser` | `admin` |
| `updateUser` | `admin` |
| `removeUser` | `admin` |

`AuthResolver`: `signup` y `login` son públicas (tienen que serlo). `revalidate` exige JWT válido pero **ningún rol específico** — cualquier usuario autenticado puede renovar su propio token.

No implementé autorización "el usuario puede editar su propio perfil sin ser admin" — hoy `updateUser` es admin-only sin excepción. Es una limitación real, no un bug: agregarla significa comparar `updateUserInput.id === currentUser.id` dentro del resolver, y no estaba pedido.

### 4.4 `JwtStrategy` valida contra la base en cada request

`JwtStrategy.validate(payload)` no confía ciegamente en el contenido del token — vuelve a buscar el usuario en la base (`AuthService.validateUser` → `UsersService.findOne`) y chequea `isActive` **en cada petición autenticada**. Esto es a propósito (así lo hace el proyecto de referencia): si desactivas o eliminas un usuario, sus tokens ya emitidos dejan de servir de inmediato en la siguiente petición, sin esperar a que expiren. El costo es una consulta extra a la base por cada request autenticado — aceptable para este tamaño de proyecto.

---

## 5. Operaciones GraphQL expuestas

```graphql
type Mutation {
  signup(signupInput: SignupInput!): AuthResponse!
  login(loginInput: LoginInput!): AuthResponse!
  createUser(createUserInput: CreateUserInput!): User!    # admin
  updateUser(updateUserInput: UpdateUserInput!): User!    # admin
  removeUser(id: ID!): User!                              # admin
}

type Query {
  revalidate: AuthResponse!                               # cualquier usuario autenticado
  profile: User!                                          # cualquier usuario autenticado
  users(roles: [ValidRoles!]): [User!]!                   # admin
  user(id: ID!): User!                                    # admin o superUser
}
```

Uso típico: `signup`/`login` devuelven `{ token, user }`; el `token` va en cada request siguiente como header `Authorization: Bearer <token>`.

### `profile` — datos del usuario logueado

Agregada en `AuthResolver`/`AuthService` (`getProfile`). Igual que `revalidate`, no exige ningún rol puntual — solo un JWT válido — porque cualquier usuario autenticado puede ver su propio perfil. No hace ninguna consulta extra a la base: el objeto `User` que entrega `@CurrentUser()` ya viene fresco de `JwtStrategy` (§4.4), así que `getProfile` es un simple passthrough.

De paso se expuso `avatar` en el `User` de GraphQL (`user.entity.ts`) — existía en la tabla desde la migración `add_user_avatar`, pero no estaba declarado como `@Field()` todavía, así que no era visible por ninguna query. Ahora `profile`, `users`, `user`, y el `user` dentro de `AuthResponse` (`signup`/`login`/`revalidate`) devuelven `avatar` (nullable). **`createUser`/`updateUser` todavía no permiten *establecer* el avatar** — solo se puede leer por ahora; escribirlo (típicamente después de subir una imagen) queda pendiente.

---

## 6. Verificación real (no solo compilación)

Se corrió `tsc -b` limpio y un flujo completo contra Neon, vía `curl` al GraphQL real (`http://localhost:3000/api/graphql` — ver nota de ruta más abajo):

1. **`signup`** → usuario nuevo, rol `user` por defecto, token JWT válido. ✅
2. **`users` sin token** → `401 Unauthorized`, el guard corta antes de llegar al resolver. ✅
3. **`revalidate` con token** → funciona sin restricción de rol, emite un token nuevo. ✅
4. **`users` con token de rol `user`** → `403 Forbidden`, mensaje "necesita alguno de estos roles: [admin]". ✅
5. Se promovió ese usuario a `admin` **directo en la base** (fuera de la API, para no depender de un admin preexistente) y se confirmó que **el mismo token siguió sirviendo** sin volver a hacer login — porque `JwtStrategy` relee el usuario de la base en cada request (§4.4), no confía en lo que el JWT dice sobre roles. ✅
6. **`users` con el mismo token, ya admin** → devuelve la lista completa, incluidos los usuarios reales que ya tenías cargados. ✅
7. **`login`** con password correcto → token nuevo. Con password incorrecto → `400 Bad Request` "Credenciales inválidas", sin filtrar detalles. ✅
8. **`createUser` autenticado como admin** → crea un usuario nuevo. ✅
9. Limpieza: se borraron ambos usuarios de prueba vía `removeUser` (uno de ellos se borró a sí mismo, con su propio token). Se confirmó por consulta directa a Postgres que la tabla `users` quedó exactamente con los 4 usuarios reales que ya tenías, sin rastro de las pruebas. ✅

### Nota sobre la ruta del endpoint

`GraphQLModule.forRoot` tiene `useGlobalPrefix: true` (ya estaba así en tu `app.module.ts`), así que el endpoint real es **`/api/graphql`**, no `/graphql` a secas. Ajusta cualquier cliente/colección de pruebas que hayas guardado con la ruta vieja.

### Nota sobre procesos huérfanos durante la verificación

Al arrancar el servidor de prueba me encontré, otra vez, un proceso Node viejo (de hace ~2 horas, de una verificación anterior) todavía escuchando en el puerto 3000 y sirviendo código sin el módulo `auth`. `TaskStop` detiene el proceso que `nx serve` lanza en primer plano, pero no siempre el proceso hijo real que queda escuchando el puerto. Si en algún momento un `nx serve` tuyo no refleja cambios recientes, vale la pena revisar qué proceso tiene realmente tomado el puerto antes de asumir que el código está mal.

---

## 7. Pendientes / siguientes pasos naturales

- **Cambiar `JWT_SECRET`** por uno real (§3) — es lo primero que haría antes de seguir.
- Autorización de "dueño del recurso" en `updateUser` (que un usuario no-admin pueda editar su propio perfil).
- En el frontend: conectar `apollo-angular` (ya instalado) a `signup`/`login`, guardar el token (ej. en `localStorage` o un servicio), y mandarlo como header `Authorization` en cada request — para eso sirve exactamente el Apollo Link de autenticación que mencioné cuando armamos `apollo-angular` (`HttpLink` no pasa por los interceptores de `HttpClient` de Angular).
- Si más adelante quieres refresh tokens (en vez de que el usuario tenga que loguearse de nuevo cada `JWT_EXPIRATION` segundos), es una pieza nueva — no está en el proyecto de referencia ni se armó acá.
