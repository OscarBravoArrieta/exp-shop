# Configuración del monorepo: librerías compartidas y Prisma ORM

> Documento de referencia de lo configurado en `exp-shop` para compartir interfaces, modelos, DTOs y validaciones entre `exp-shop-server` (NestJS) y `exp-shop-web` (Angular), y para la integración de Prisma ORM contra Postgres (Neon).

**Versiones base:** Nx 23.2.0 · Angular ~22.1.0 · NestJS 11 · TypeScript ~6.0.3 · Prisma / `@prisma/client` 7.10.0

---

## 1. Objetivo

El workspace es un monorepo Nx **integrado** (un solo `package.json`/`node_modules` en la raíz; ningún proyecto bajo `apps/` o `libs/` tiene `package.json` propio). El objetivo del trabajo realizado fue dejar la infraestructura de TypeScript, Nx y Prisma correctamente configurada para que:

- El backend y el frontend compartan **interfaces, modelos y DTOs** (con `class-validator`) desde librerías comunes, sin duplicar tipos.
- El acceso a base de datos (Prisma) quede aislado en una librería **solo-backend**, sin riesgo de que su código (no apto para navegador) se filtre al bundle de Angular.
- `enforce-module-boundaries` de ESLint proteja esas reglas automáticamente vía tags de proyecto.

---

## 2. Estructura de proyectos y tags

| Proyecto | Tipo | Tags | Propósito |
|---|---|---|---|
| `apps/exp-shop-server` | app | `scope:backend`, `type:app` | API NestJS |
| `apps/exp-shop-web` | app | `scope:frontend`, `type:app` | SPA Angular (SSR) |
| `libs/shared/interfaces` | lib | `scope:shared`, `type:util` | Interfaces, modelos y DTOs (`class-validator`) compartidos por ambas apps |
| `libs/shared/utils` | lib | `scope:shared`, `type:util` | Utilidades JS puras compartidas |
| `libs/shared/ui` | lib | `scope:frontend`, `type:ui` | Componentes Angular reutilizables (solo frontend) |
| `libs/backend/prisma` | lib | `scope:backend`, `type:util` | Prisma ORM: schema, migraciones, cliente generado, `PrismaService` |

La regla `@nx/enforce-module-boundaries` (en `eslint.config.mjs`) usa estos tags para impedir, por ejemplo, que `exp-shop-web` (scope:frontend) importe `libs/backend/prisma` (scope:backend) — evita que el cliente de Prisma (que requiere Node y no corre en navegador) termine empaquetado en el bundle de Angular.

---

## 3. Corrección de las rutas (`paths`) en `tsconfig.base.json`

**Problema encontrado:** los `paths` de `interfaces` y `utils` estaban mal escritos — usaban una clave terminada en `/` sin `*`, que en TypeScript solo hace *match* exacto de esa cadena literal, nunca de subrutas. En la práctica, **no se podía importar `@exp-shop/shared/interfaces` desde ningún proyecto**.

**Corrección aplicada** (wildcards reales + entrada de barril):

```jsonc
"paths": {
  "@exp-shop/shared/interfaces": ["./libs/shared/interfaces/src/index.ts"],
  "@exp-shop/shared/interfaces/*": ["./libs/shared/interfaces/src/*"],
  "@exp-shop/shared/utils": ["./libs/shared/utils/src/index.ts"],
  "@exp-shop/shared/utils/*": ["./libs/shared/utils/src/*"],
  "@exp-shop/shared/ui": ["./libs/shared/ui/src/index.ts"],
  "@exp-shop/shared/ui/*": ["./libs/shared/ui/src/*"],
  "@org/prisma": ["./libs/backend/prisma/src/index.ts"]
}
```

También se agregó a nivel base:

```jsonc
"experimentalDecorators": true,
"emitDecoratorMetadata": true,
```

necesarios para que las clases DTO con decoradores de `class-validator` compilen en cualquier proyecto consumidor (antes solo estaban declarados sueltos en configs de apps individuales).

---

## 4. Corrección de project references / composite builds

TypeScript, con `composite: true` a nivel base, exige que cualquier proyecto que importe código de **otro** proyecto composite lo declare en su `references`, y que ese proyecto tenga `declaration: true`. Se encontraron y corrigieron varios huecos:

- **`module: "commonjs"` chocando con `moduleResolution: "nodenext"`** (heredado del base) en `libs/shared/interfaces/tsconfig.json`, `libs/shared/utils/tsconfig.json` y `libs/backend/prisma/tsconfig.json` (TS5110). Se quitó el override para heredar `nodenext` correctamente.
- **Faltaba `declaration: true`** en `apps/exp-shop-server/tsconfig.app.json` y `apps/exp-shop-web/tsconfig.spec.json` (TS6304 "Composite projects may not disable declaration emit").
- **Faltaban `references`** de las apps hacia las libs compartidas que consumen. Se agregaron en:
  - `apps/exp-shop-server/tsconfig.app.json` → `libs/shared/interfaces`, `libs/backend/prisma`
  - `apps/exp-shop-web/tsconfig.app.json` y `tsconfig.spec.json` → `libs/shared/interfaces`, `libs/shared/utils`, `libs/shared/ui`
- **`rootDir` de las apps** apuntando a la raíz del workspace (`../..` / `../../..` según la profundidad), tal como ya intuías en `notes.txt` — necesario para que TS acepte archivos fuente de otro proyecto composite dentro del mismo programa de compilación.
- **Colisión de caché de build**: las libs y apps compartían literalmente la misma carpeta `dist/out-tsc` sin subcarpeta por proyecto, así que sus `.tsbuildinfo` y `.d.ts` (p. ej. `index.d.ts`) se pisaban entre sí. Con `rootDir` apuntando a la raíz del repo en cada proyecto, cada uno ahora emite a su propia subruta (`dist/out-tsc/libs/shared/interfaces/...`, `dist/out-tsc/libs/backend/prisma/...`, etc.).
- `libs/shared/ui/tsconfig.lib.json` tenía `inlineSources: true` sin `sourceMap: true` (TS5051) — corregido.
- El `tsconfig.json` raíz tenía `"references": []` (vacío e inútil) — se pobló con los 6 proyectos principales para que `tsc -b` desde la raíz compile todo el workspace de una vez.

Todo el árbol (`interfaces`, `utils`, `ui`, `backend/prisma`, `exp-shop-server`, `exp-shop-web`) se validó con `tsc -b` sin errores.

---

## 5. Ejemplo de contrato compartido: `Product` / `CreateProductDto`

En `libs/shared/interfaces/src/lib/` se creó un ejemplo funcional de extremo a extremo:

- `models/product.model.ts` → interfaz `Product` (forma plana, sin dependencias de framework).
- `dtos/create-product.dto.ts` → clase `CreateProductDto` con decoradores de `class-validator` (`@IsString`, `@IsNumber`, `@IsPositive`, `@IsOptional`, `@MinLength`).

Conectado de verdad en ambas apps:

- **Backend**: `main.ts` registra `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`; `AppController`/`AppService` exponen `POST /products` validando contra `CreateProductDto`.
- **Frontend**: `App` importa y usa el tipo `Product`.

Patrón a seguir para nuevos contratos: definir el modelo/DTO en `libs/shared/interfaces`, exportarlo desde su `index.ts`, e importarlo con `@exp-shop/shared/interfaces` desde cualquiera de las dos apps — sin configuración adicional.

---

## 6. Fix del build de Angular (`NG4006` / `TS5069`)

**Síntoma:** `nx serve exp-shop-web` fallaba con:
```
NG4006: TS compiler option "emitDeclarationOnly" is not supported.
TS5069: Option 'emitDeclarationOnly' cannot be specified without specifying option 'declaration' or option 'composite'.
```

**Causa:** `tsconfig.base.json` tiene `emitDeclarationOnly: true` a propósito, para que `nx build`/`typecheck` sobre las libs compartidas solo emita `.d.ts` (se consumen directo desde su fuente vía los `paths`, no vía JS compilado). Angular, sin embargo, **rechaza esa opción de plano** en cualquier proyecto que construya con `@angular/build`.

**Corrección:** se sobreescribió `emitDeclarationOnly: false` específicamente en `apps/exp-shop-web/tsconfig.json` (heredado por `tsconfig.app.json` y `tsconfig.spec.json`). El backend y las libs compartidas conservan `emitDeclarationOnly: true` del base.

---

## 7. Prisma ORM

### 7.1 Decisión de arquitectura

Prisma Client es una librería de **Node.js** (usa un driver nativo) — no puede ejecutarse en el navegador. Por eso vive en una librería **solo-backend** (`libs/backend/prisma`, tags `scope:backend`/`type:util`), nunca en `scope:shared`. Lo que sí se comparte con el frontend son los **tipos/contratos** planos (`libs/shared/interfaces`), no el cliente de Prisma en sí.

### 7.2 Paquetes instalados (raíz del repo — único lugar posible en un monorepo integrado)

```
dependencies:    @prisma/client@7.10.0, @prisma/config@7.10.0, @prisma/adapter-pg@7.10.0, pg@8.23.x, dotenv
devDependencies: prisma@7.10.0, @types/pg
```

**Nota de versión:** Prisma 7 eliminó el motor de consultas embebido en Rust — **ahora exige un "driver adapter"** para cualquier proveedor SQL. Para Postgres/Neon: `@prisma/adapter-pg` + `pg` (conexión TCP estándar, ideal para un servidor Nest persistente). La alternativa `@prisma/adapter-neon` + `@neondatabase/serverless` solo aplica si en el futuro se despliega a edge/serverless functions.

### 7.3 `prisma.config.ts` (raíz del repo)

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "libs/backend/prisma/src/lib/schema.prisma",
  migrations: {
    path: "libs/backend/prisma/src/lib/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

Puntos clave que causaron confusión y quedaron resueltos:
- El archivo **debe llamarse exactamente `prisma.config.ts`** en la raíz (no `prisma7.config.ts` ni ningún otro nombre) — es lo único que el CLI de Prisma autodetecta.
- `schema` y `migrations.path` son **rutas de sistema de archivos reales**, relativas a la raíz del repo — no son alias de TypeScript (`@org/prisma` de `tsconfig.base.json` solo lo entienden `tsc`/los bundlers al compilar código de aplicación; el CLI de Prisma carga este archivo con su propio loader, ajeno a esos `paths`).
- `datasource.url = env("DATABASE_URL")` sí es correcto tal cual — el CLI (`migrate`, `db push`, etc.) lo usa para sus propias operaciones aunque el `PrismaClient` de la app se conecte vía el driver adapter.

### 7.4 Schema y generador (`libs/backend/prisma/src/lib/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

`output` es obligatorio en Prisma 7 (ya no se genera implícitamente en `node_modules`). Resuelve a `libs/backend/prisma/src/generated/prisma` — carpeta regenerable, **ignorada en git** (ver §8).

### 7.5 `PrismaService` / `PrismaModule`

`libs/backend/prisma/src/lib/prisma.service.ts`:

```ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }) });
  }
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

`PrismaModule` es `@Global()` — se importa una sola vez en `AppModule` y `PrismaService` queda disponible para inyectar en cualquier módulo/servicio del backend.

`main.ts` ahora carga `import 'dotenv/config'` al inicio, para que `process.env.DATABASE_URL` exista en tiempo de ejecución del servidor (antes solo lo cargaba el CLI de Prisma).

### 7.6 Base de datos: Neon Postgres

- Proyecto `exp-shop` en Neon (plan gratuito). `DATABASE_URL` en `.env` (raíz) usa el **endpoint pooled** (`-pooler` en el host, PgBouncer).
- Primer modelo: `User` (`id`, `fullName`, `email` único, `password`, `roles: String[]`, `isActive`, `createdAt`, `updatedAt`), mapeado a la tabla `users`.
- Primera migración aplicada: `npx prisma migrate dev --name init_user` → `libs/backend/prisma/src/lib/migrations/20260917205548_init_user/migration.sql`. La tabla `users` ya existe en la base real.

---

## 8. Seguridad: `.gitignore`

Se detectó y corrigió antes de cualquier commit:

- **`.env`** (con la contraseña real de Neon) no estaba ignorado.
- La entrada existente `/generated/prisma` estaba mal anclada (solo cubría la raíz del repo, no `libs/backend/prisma/src/generated/prisma`).

```gitignore
# Prisma generated client (regenerado con `prisma generate`)
**/generated/prisma

# Variables de entorno (contienen credenciales reales)
.env
.env.*
!.env.example
```

Se confirmó vía `git log` que el `.env` nunca llegó a commitearse.

---

## 9. Entorno: `NX Failed to process project graph` (`@nx/playwright/plugin` worker exited unexpectedly)

**Síntoma:** cualquier comando `nx` (`serve`, `g`, `build`, etc.) falla con:
```
NX   Failed to process project graph.
An error occurred while processing files for the @nx/playwright/plugin plugin (Defined at nx.json#plugins[2]).
  - Plugin worker "@nx/playwright/plugin" exited unexpectedly.
```

**Causa:** Nx aísla cada plugin (incluido `@nx/playwright`) en un subproceso propio, comunicándose por un named pipe de Windows. En esta máquina ese subproceso falla al abrir su pipe (probablemente interferencia de antivirus/EDR con sockets de child processes) — y como el aislamiento aplica a todo el project graph, bloquea *cualquier* comando `nx`, no solo los relacionados con e2e/Playwright.

**Solución permanente:**
1. Variable de entorno de **usuario** en Windows: `NX_ISOLATE_PLUGINS=false` (exacto en minúsculas — Nx compara el string literal `'false'`). Configuración → Variables de entorno → Variables de usuario → Nueva. Requiere cerrar **todas** las ventanas de la app que abre la terminal (VS Code incluido) y volver a abrirla — un cambio de variable de entorno del sistema no llega a procesos ya corriendo.
2. Si el error persiste con la variable ya confirmada (`$env:NX_ISOLATE_PLUGINS` la imprime en `false`), es porque el **daemon de Nx** — un proceso de fondo que sobrevive al cierre de la terminal — quedó arrancado desde antes de que la variable existiera. Un solo `npx nx daemon --stop` lo mata; el próximo comando levanta un daemon nuevo que sí hereda la variable correcta. No debería hacer falta repetirlo salvo que la variable de entorno cambie de nuevo.

---

## 10. Pendientes conocidos (no bloquean lo anterior)

- **Proyectos e2e** (`apps/exp-shop-server-e2e`, `apps/exp-shop-web-e2e`): al compilar todo el árbol con `tsc -b` aparecen errores preexistentes y no relacionados con lo anterior — tipos de `jest` faltantes, `module`/`moduleResolution` inconsistentes, y uso de `import.meta.dirname` en `playwright.config.mts` (requiere Node ≥ 20.11). No se tocaron.
- **Migraciones futuras**: recuerda correr `npx prisma migrate dev --name <nombre>` cada vez que cambies `schema.prisma`, y `npx prisma generate` si solo cambias el generador sin tocar el modelo (migrate ya lo hace automático).
- Vale la pena correr `npm install` para que `package-lock.json` refleje el paso de `dotenv` de `devDependencies` a `dependencies`.

---

## 11. Archivos de "skills" de agentes de IA (`.agents/`, `.claude/skills/`, `.cursor/`, `.github/instructions/`, `.opencode/`)

Son paquetes de **documentación de referencia** que asistentes de IA (Claude Code, Cursor, Copilot, opencode, Windsurf) cargan para responder con la sintaxis/CLI/API *actual* de una herramienta (en este caso, Prisma y Nx) en lugar de depender solo de conocimiento entrenado, que puede estar desactualizado. Se instalaron automáticamente al invocar por primera vez ayuda especializada de Prisma en esta sesión. No son código de la aplicación — son intercambiables entre editores/asistentes, por eso aparecen replicados en varias carpetas (una por herramienta). `skills-lock.json` fija qué versión de cada skill quedó instalada. Queda a tu criterio si los versionas (para que cualquier compañero que abra el repo con estas herramientas tenga el mismo contexto) o los agregas a `.gitignore` como tooling local.
