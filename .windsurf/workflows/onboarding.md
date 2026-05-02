---
description: Onboarding para nuevos desarrolladores en Contab
---

# Onboarding - Sistema Contab Multi-Tenant

Bienvenido al equipo de desarrollo de **Contab**, el sistema contable para contadores hondureños. Este workflow te guiará para configurar tu entorno de desarrollo local.

## Stack Tecnológico

- **Next.js 16** con App Router
- **TypeScript** para tipado seguro
- **Tailwind CSS** + **Radix UI** para UI
- **Prisma ORM** para base de datos
- **Supabase** como BaaS (PostgreSQL + Auth + Storage)
- **Clerk** para autenticación
- **@react-pdf/renderer** para generación de PDFs

---

## 1. Requisitos Previos

Asegúrate de tener instalado:

- **Node.js 18+** ([Descargar](https://nodejs.org/))
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

// turbo
```bash
npm install
```

---

## 4. Configurar Variables de Entorno

Copia el archivo de ejemplo:

// turbo
```bash
cp .env.example .env.local
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

---

## 5. Configurar Base de Datos

### Opción A: Usar Supabase (Recomendado para producción)

1. En el Dashboard de Supabase, ve a **SQL Editor**
2. Ejecuta los scripts en este orden:
   1. `SUPABASE_COMPLETE.sql`
   2. `COMPLETE_SYSTEM_SETUP.sql`
   3. `LEGAL_REVISIONES_SCHEMA.sql`
   4. `LEGAL_REVISIONES_PROCEDURES_V2.sql`
   5. `SUPABASE_RLS_SETUP.sql`

3. Genera el cliente Prisma:

// turbo
```bash
npx prisma generate
```

### Opción B: Usar SQLite (Para desarrollo local rápido)

Si no tienes acceso a Supabase, puedes usar SQLite para pruebas locales.

1. Actualiza tu `.env.local`:

```bash
DATABASE_URL="file:./dev.db"
```

2. Ejecuta migraciones:

// turbo
```bash
npx prisma migrate dev
```

---

## 6. Seed de Datos Iniciales (Opcional)

Para tener datos de ejemplo:

// turbo
```bash
npx tsx prisma/seed-tax-configs.ts
npx tsx prisma/seed-patient-billing.ts
npx tsx prisma/sample-tax-transactions.ts
```

---

## 7. Iniciar Servidor de Desarrollo

// turbo
```bash
npm run dev
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
│   ├── hooks/            # Custom hooks
│   └── supabase/         # Clientes Supabase
├── prisma/               # Schema y migraciones
├── services/             # Lógica de negocio
└── types/                # Tipos TypeScript
```

---

## 9. Guías de Referencia

- **Documentación completa**: `DOCUMENTATION.md`
- **Guía de variables de entorno**: `CHECK_ENVIRONMENT.md`
- **Plan de migración PostgreSQL**: `POSTGRESQL_MIGRATION_PLAN.md`
- **Guía de utilidades de fecha**: `DATE_UTILS_GUIDE.md`
- **Protección Super Admin**: `SUPER_ADMIN_PROTECTION.md`

---

## 10. Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Iniciar servidor de desarrollo |
| `npm run build` | Construir para producción |
| `npm run lint` | Ejecutar ESLint |
| `npx prisma generate` | Generar cliente Prisma |
| `npx prisma migrate dev` | Crear/ ejecutar migraciones |
| `npx prisma studio` | Abrir Prisma Studio |

---

## 11. Puntos Importantes del Sistema

### Multi-Tenant
- Cada empresa tiene un `tenantId` único
- RLS (Row Level Security) aísla datos por tenant
- Usa el TenantContext para acceder al tenant actual

### Contabilidad
- **Pólizas**: Ingreso, Egreso, Diario, Ajuste
- **Cuentas**: Plan de cuentas jerárquico
- **Balanza**: Balanza de comprobación automática
- **Cierre**: Cierre mensual y anual

### Fiscal (Honduras)
- **CAI**: Código de Autorización de Impresión
- **ISV**: Impuesto sobre Ventas 15%
- **SAR**: Servicio de Administración de Rentas
- **Formulario 221**: Declaración mensual ISV

---

## 12. Verificación de Setup

Para verificar que todo funciona:

1. ✅ Servidor de desarrollo inicia sin errores
2. ✅ Puedes acceder a `/dashboard`
3. ✅ Puedes crear una transacción de prueba
4. ✅ Puedes generar un reporte PDF

Si tienes problemas:
- Revisa las variables de entorno
- Verifica los logs de Supabase
- Consulta la documentación en `DOCUMENTATION.md`

---

## Contacto y Soporte

- **Tech Lead**: [Nombre del Tech Lead]
- **Canal de Slack**: #dev-contab
- **Reuniones de equipo**: [Días y horas]

**¡Bienvenido al equipo! 🎉**
