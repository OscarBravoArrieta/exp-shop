# Módulo `users` — CRUD completo (NestJS + Prisma + GraphQL)

> Andamiaje completo del CRUD de usuarios en `apps/exp-shop-server/src/app/users/`, construido sobre el patrón analizado en `docs/analisis-auth-users-nest-anylist.md`, adaptado de TypeORM a Prisma. Verificado end-to-end contra la base real de Neon (no solo compilación) — ver §5.

---

## 1. Archivos creados

```
apps/exp-shop-server/src/app/users/
├── user.entity.ts              → @ObjectType() GraphQL, propio del backend
├── users.module.ts
├── users.resolver.ts
├── users.service.ts
└── dto/
    ├── create-user.input.ts    → @InputType() GraphQL, con class-validator
    └── update-user.input.ts    → PartialType(CreateUserInput) + id
```

Registrado en `AppModule` (`imports: [..., UsersModule]`).

---

## 2. Decisiones de diseño (y por qué)

### 2.1 `User` (GraphQL) es una clase nueva, no la del schema de Prisma ni la de `libs/shared/interfaces`

Hay ahora **tres** representaciones de "usuario" en el proyecto, y es intencional:
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
|                      Dónde                                         |    Qué es                            | Para qué                                                            |
|--------------------------------------------------------------------|--------------------------------------|-------------------------------------------------------------------- |
| `libs/backend/prisma/schema.prisma` → `model User`                 | Fuente de verdad de la base de datos | Persistencia (Prisma genera su propio tipo `User` a partir de esto) |
| `apps/exp-shop-server/src/app/users/user.entity.ts` → `class User` | `@ObjectType()` de GraphQL           | Define lo que el **schema GraphQL** expone al mundo                 |
| `libs/shared/interfaces` → `interface User`                        | Interfaz TS plana                    | La consume Angular por **REST**                                     |
|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

Mezclar cualquiera de estas sería un error: decorar el modelo de Prisma con `@ObjectType()` acoplaría tu capa de datos a GraphQL; reusar la interfaz de `libs/shared/interfaces` (que importa Angular) con decoradores de `@nestjs/graphql` arrastraría dependencias de servidor al bundle del navegador. Ya habíamos tomado esta misma decisión para `Product`/`CreateProductDto` — este módulo sigue el mismo criterio.

**Consecuencia práctica:** los campos se repiten a mano en dos o tres lugares (Prisma, entidad GraphQL, y a veces la interfaz compartida). Es una duplicación deliberada, no un descuido — el costo es mantener 2-3 lugares sincronizados a mano cuando cambia el modelo; el beneficio es que cada capa solo carga las dependencias que realmente necesita.

### 2.2 El password nunca es un `@Field()`

```ts
// user.entity.ts — no hay @Field() en password, ni siquiera existe la propiedad
```

Los servicios (`UsersService.create`, `findOne`, etc.) sí devuelven el objeto completo de Prisma, **con** el hash de password incluido — lo necesita, por ejemplo, un futuro `AuthService.login` para comparar contraseñas. Pero GraphQL solo serializa los campos que el `@ObjectType()` declaró con `@Field()`; como el resolver tipa su retorno contra la clase `User` (sin password), ese campo nunca llega a ningún cliente, sin importar qué tenga el objeto en memoria. Es el mismo mecanismo que usa el proyecto de referencia (`nest-anylist`), solo que ahí lo lograban comentando el `@Field()`.

### 2.3 `bcryptjs` en vez de `bcrypt`

El proyecto de referencia usa `bcrypt` (con bindings nativos, compilados vía `node-gyp`). En **este** repo ya veníamos viendo que npm bloquea los scripts de instalación (`postinstall`/`install`) de varios paquetes por política de seguridad (`@swc/core`, `@prisma/engines`, `esbuild`, etc. — lo vimos en cada `npm install` de esta sesión). `bcrypt` nativo habría caído en la misma categoría y probablemente fallado en runtime sin el binario compilado. `bcryptjs` es una reimplementación 100% JavaScript, sin bindings nativos ni scripts de instalación — mismo API (`hash`, `hashSync`, `compare`, `compareSync`), cero fricción en este entorno.

### 2.4 Sin guards todavía

`UsersResolver` no tiene `@UseGuards(JwtAuthGuard)` ni `@CurrentUser()` — porque el módulo `auth` **todavía no existe** en `exp-shop`. Ahora mismo, cualquiera puede llamar a `createUser`/`users`/`user`/`updateUser`/`removeUser` sin autenticarse. Es una brecha de seguridad real y consciente, no un olvido — se cierra en cuanto construyamos `auth` (que ya analizamos en detalle) y volvamos a este resolver a agregar los guards, exactamente como está documentado en el paso 12 de la guía paso a paso del análisis anterior.

### 2.5 `isActive` no está en `UpdateUserInput`

`UpdateUserInput extends PartialType(CreateUserInput)`, y `CreateUserInput` no tiene `isActive` (un usuario nuevo siempre nace activo, por default de Prisma). Por diseño, activar/desactivar una cuenta no es un "update genérico" — en el proyecto de referencia es una mutation aparte (`blockUser`). No agregué esa mutation acá porque no la pediste explícitamente; si la quieres, es un método más en `UsersService` (`toggleActive` o similar) + una mutation en el resolver, del mismo tamaño que `remove`.

---

## 3. Manejo de errores de Prisma

`UsersService.handleDbErrors` traduce los códigos de error de Prisma a excepciones HTTP/GraphQL legibles:

| Código Prisma | Significado | Excepción lanzada |
|---|---|---|
| `P2002` | Violación de constraint único (ej. email duplicado) | `BadRequestException` con el nombre del campo |
| `P2025` | El registro a actualizar/borrar no existe | `NotFoundException` |
| cualquier otro | Error no anticipado | se loguea completo y se devuelve `InternalServerErrorException` genérico (no se filtran detalles internos al cliente) |

Es el mismo criterio que `handleDBErrors` en `nest-anylist` (que traducía el código `23505` de Postgres) — acá se traduce el código equivalente de Prisma en vez del código nativo de Postgres, porque Prisma ya lo normaliza por nosotros.

---

## 4. Operaciones expuestas

```graphql
type Mutation {
  createUser(createUserInput: CreateUserInput!): User!
  updateUser(updateUserInput: UpdateUserInput!): User!
  removeUser(id: ID!): User!
}

type Query {
  users(roles: [String!]): [User!]!
  user(id: ID!): User!
}
```

`users(roles: [...])` — si no se pasa `roles`, devuelve todos; si se pasa, filtra con el operador `hasSome` de Prisma (equivalente al `ARRAY[roles] && ARRAY[:...roles]` que hacía `nest-anylist` a mano con `createQueryBuilder`, pero nativo de Prisma para columnas array de Postgres).

---

## 5. Verificación real (no solo compilación)

Se corrió `tsc -b` (limpio) y, más importante, un ciclo CRUD completo contra tu base de Neon real, vía `curl` al GraphQL en vivo:

1. **`createUser`** → usuario creado, `roles` default `["user"]`, respuesta sin password. ✅
2. **`user(id)`** → lo trae de vuelta completo. ✅
3. **`users(roles: ["user"])`** → filtro por rol funciona. ✅
4. **`updateUser`** → cambia `fullName`, confirma que campos no enviados no se tocan. ✅
5. **`removeUser`** → borra; una consulta posterior confirma `NotFoundException`. ✅
6. **Email duplicado** → segundo `createUser` con el mismo email devuelve `BadRequestException` ("Ya existe un usuario con ese..."), no un error 500 crudo. ✅
7. **Validación de `class-validator`** → password corto + email inválido + fullName corto en un solo intento devuelven los tres mensajes de error específicos, sin tocar la base. ✅
8. **Hash real en la base** → se consultó la fila directo en Postgres (vía `pg`, sin pasar por la API) y el valor guardado es `$2b$10$...` (formato bcrypt válido), no el texto plano. ✅

Todos los usuarios de prueba creados durante la verificación fueron eliminados al terminar — la base quedó como estaba.

---

## 6. Siguiente paso natural

Con `UsersService` ya expuesto (`exports: [UsersService]`), construir `AuthModule` es el paso que sigue en la guía de la sección 5 de `docs/analisis-auth-users-nest-anylist.md`: `AuthModule` va a importar `UsersModule`, inyectar `UsersService` en `AuthService`, y recién ahí `UsersResolver` gana sentido protegerlo con `JwtAuthGuard`/`@CurrentUser()`.
