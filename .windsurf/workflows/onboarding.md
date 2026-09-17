---
description: Onboarding para nuevos desarrolladores en Contab
---

# Onboarding - Sistema Contab Multi-Tenant

Bienvenido al equipo de desarrollo de **Contab**, el sistema contable para contadores hondureños. Este workflow te guiará para configurar tu entorno de desarrollo local.

> **Última actualización:** 16 de Septiembre de 2026

## Stack Tecnológico

- **Next.js 16.3.5** con App Router y Turbopack
- **React 19** + **TypeScript** para tipado seguro
- **Tailwind CSS** + **Radix UI** / **shadcn/ui** para UI
- **Prisma 5.x** ORM para base de datos
- **Supabase** como BaaS (PostgreSQL + Storage) — la base de datos es **PostgreSQL/Supabase**, no SQLite
- **Clerk** para autenticación (`clerkMiddleware`, rutas protegidas con `auth.protect()`)
- **@react-pdf/renderer** para generación de PDFs
- **Output de build:** `standalone` (`next.config.js`)

---

## 1. Requisitos Previos

Asegúrate de tener instalado:

- **Node.js portable del proyecto:**
  `C:\Users\denta\OneDrive\Documentos\Default Project\Node\node-v24.19.0-win-x64` (Node 24). Para usar su `node.exe`, invócalo directamente con `& "ruta\node.exe"` en PowerShell.
- **pnpm:** en Windows `pnpm.ps1` está bloqueado por política de ejecución; usa **`pnpm.cmd`** (mismo directorio de pnpm).
- **Git** ([Descargar](https://git-scm.com/))
- Una cuenta en **Supabase** ([Crear cuenta](https://supabase.com/))
- Una cuenta en **Clerk** ([Crear cuenta](https://clerk.dev/))

---

## 2. Clonar el Repositorio

```bash
git clone <repo-url>
cd contab
```

---

## 3. Instalar Dependencias

```bash
pnpm.cmd install
```

---

## 4. Configurar Variables de Entorno

Copia el archivo de ejemplo:

```bash
Copy-Item .env.example .env.local
```

### Variables de Clerk (Obligatorias)

1. Ve al [Dashboard de Clerk](https://dashboard.clerk.dev/)
2. Crea una nueva aplicación o selecciona la existente
3. Copia las siguientes variables:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_OUT_URL=/auth/login
```

### Variables de Supabase (Obligatorias)

1. Ve al [Dashboard de Supabase](https://app.supabase.io/)
2. Selecciona tu proyecto
3. Ve a **Settings > API**
4. Copia las siguientes variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ En `.env.local` **no existe** `SUPABASE_URL` (solo `NEXT_PUBLIC_SUPABASE_URL`). No la agregues.

### Variable de Base de Datos (Obligatoria)

```bash
DATABASE_URL=postgresql://...   # conexión directa a Postgres (Supabase)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. Configurar Base de Datos

### Opción A: Usar Supabase (La actual del proyecto)

La base es **PostgreSQL/Supabase**. **No hay acceso DDL directo** (la conexión `db.<ref>.supabase.co:5432` da `getaddrinfo ENOTFOUND`), por lo que el SQL se ejecuta desde el **SQL Editor** de Supabase:

1. En el Dashboard de Supabase, ve a **SQL Editor** y ejecuta los scripts de `scripts/migrations/` que necesites, en orden:
   1. `SUPABASE_COMPLETE.sql`
   2. `LEGAL_REVISIONES_SCHEMA.sql`
   3. `LEGAL_REVISIONES_PROCEDURES_V2.sql`
   4. `SUPABASE_RLS_SETUP.sql`

2. Genera el cliente Prisma (no aplica DDL):

```bash
pnpm.cmd prisma generate
```

### Opción B: SQLite (obsoleta, solo desarrollo rápido puntual)

Históricamente se podía usar SQLite con `DATABASE_URL="file:./dev.db"`. **Ya no es la vía del proyecto**: la base real es Supabase/Postgres y el código depende de sus funciones/políticas. Usa siempre la Opción A.

---

## 6. Seed de Datos Iniciales (Opcional)

Para tener datos de ejemplo:

```bash
pnpm.cmd tsx prisma/seed-tax-configs.ts
pnpm.cmd tsx prisma/seed-patient-billing.ts
pnpm.cmd tsx prisma/sample-tax-transactions.ts
```

---

## 7. Iniciar Servidor de Desarrollo

```bash
pnpm.cmd dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 8. Estructura del Proyecto

Familiarízate con la estructura de carpetas:

```
contab/
├── app/                    # Páginas Next.js (App Router)
│   ├── (auth)/            # Grupo de rutas de autenticación
│   ├── accounting/        # Contabilidad (pólizas, cuentas)
│   ├── dashboard/         # Dashboards
│   ├── reports/           # Reportes y PDFs
│   └── settings/          # Configuración
├── components/            # Componentes React
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── accounting/       # Componentes contables
│   └── reports/          # Componentes de PDFs
├── lib/                   # Utilidades y configuración
│   ├── actions/          # Server Actions
│   ├── services/         # Lógica de negocio (notes-service, diat-generator, ...)
│   └── supabase/         # Clientes Supabase
├── prisma/               # Schema y migraciones
├── services/             # Lógica de negocio
└── types/                # Tipos TypeScript
```

---

## 9. Autenticación y Middleware (importante)

`middleware.ts` usa **`clerkMiddleware`**:

- Las rutas **no públicas** ejecutan `await auth.protect()`, que devuelve **HTTP 404** (no redirect) a usuarios no autenticados.
- Rutas públicas actuales: `/auth/login`, `/auth/register`, `/auth/sign-in`, `/auth/sign-up`, `/auth/callback`, `/auth/reset-password`, `/api/auth/check-email`, `/api/auth/check-username`, `/api/admin/plans-public`, `/api/paypal/*`, `/api/webhooks/*`, `/api/accounting/uploaded-files`, `/api/accounting/excel-upload`, `/api/accounting/trial-balance`, `/`.
- Inyecta la cabecera `x-tenant-id` desde la metadata de Clerk (si la petición no trae ya un tenant explícito).
- Las rutas `/admin(.*)` y `/api/admin/(.*)` redirigen a login o restringen por rol.

Consecuencia: **los `curl`/`Invoke-WebRequest` sin sesión a rutas protegidas devolverán 404 aunque la ruta exista.** Prueba siempre desde el navegador con sesión iniciada, o contra rutas públicas.

---

## 10. Guías de Referencia

- **Documentación completa**: `DOCUMENTATION.md`
- **Variables de entorno**: `docs/CHECK_ENVIRONMENT.md`
- **Cómo aplicar migraciones (SQL Editor)**: `docs/RUN_MIGRATION.md`
- **Plan de migración PostgreSQL**: `docs/POSTGRESQL_MIGRATION_PLAN.md`
- **Guía de utilidades de fecha**: `docs/DATE_UTILS_GUIDE.md`
- **Protección Super Admin**: `docs/SUPER_ADMIN_PROTECTION.md`
- **DIAT**: `docs/DIAT_REPORT.md`

---

## 11. Comandos Útiles

> `pnpm.ps1` está bloqueado: usa `pnpm.cmd` (o anteponer la ruta del Node portable al ejecutarlo).

| Comando | Descripción |
|---------|-------------|
| `pnpm.cmd dev` | Iniciar servidor de desarrollo |
| `pnpm.cmd build` | Construir para producción (`prisma generate && next build`) |
| `pnpm.cmd lint` | Ejecutar ESLint |
| `pnpm.cmd prisma generate` | Generar cliente Prisma |
| `pnpm.cmd prisma migrate dev` | Crear/ejecutar migraciones (solo contra Postgres con acceso directo) |
| `pnpm.cmd prisma studio` | Abrir Prisma Studio |

**Build de producción:** `pnpm.cmd build` (`prisma generate && next build`), EXIT=0 con "Compiled successfully". Con `output: 'standalone'`: para servir producción usa `node .next/standalone/server.js` (con `PORT`), copiando `.next/static`, `public` y `.env.local` dentro de `.next/standalone`. **`next start` NO funciona con `output: 'standalone'`.**

---

## 12. Puntos Importantes del Sistema

### Multi-Tenant
- Cada empresa tiene un `tenantId` único
- RLS (Row Level Security) aísla datos por tenant
- El middleware inyecta `x-tenant-id` desde la metadata de Clerk

### Contabilidad
- **Pólizas**: Ingreso, Egreso, Diario, Ajuste
- **Cuentas**: Plan de cuentas jerárquico
- **Balanza**: Balanza de comprobación automática
- **Cierre**: Cierre mensual y anual

### Fiscal (Honduras)
- **CAI**: Código de Autorización de Impresión
- **ISV**: Impuesto sobre Ventas 15%
- **SAR**: Servicio de Administración de Rentas
- **DIAT**: Declaración Informativa Anual de Transacciones (`lib/services/diat-generator.ts`, `/api/diat`, `/companies/[id]/diat`)
- **Notas de Crédito/Débito**: `lib/services/notes-service.ts`, `/api/billing/notes`, `components/billing/NoteForm.tsx`

---

## 13. Verificación de Setup

Para verificar que todo funciona:

1. ✅ Servidor de desarrollo inicia sin errores (`pnpm.cmd dev`)
2. ✅ Puedes iniciar sesión en `/auth/login` (ruta pública) y acceder a `/dashboard`
3. ✅ Puedes crear una transacción de prueba
4. ✅ `pnpm.cmd build` termina con EXIT=0

Si tienes problemas:
- Revisa las variables de entorno (`docs/CHECK_ENVIRONMENT.md`)
- Recuerda que sin sesión las rutas protegidas devuelven **404**
- Verifica los logs de Supabase
- Consulta la documentación en `DOCUMENTATION.md`

---

## Contacto y Soporte

- **Tech Lead**: [Nombre del Tech Lead]
- **Canal de Slack**: #dev-contab
- **Reuniones de equipo**: [Días y horas]

**¡Bienvenido al equipo! 🎉**