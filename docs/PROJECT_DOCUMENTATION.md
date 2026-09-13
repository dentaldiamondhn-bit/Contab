# Documentación Completa del Proyecto Contab

> **Nombre:** Contab - Sistema Contable Profesional
> **Versión:** 1.0.0
> **Plataforma:** Next.js 16 + React 19 + TypeScript
> **Base de Datos:** PostgreSQL (Supabase) + Prisma ORM
> **Auth:** Clerk
> **Deploy:** Vercel
> **País objetivo:** Honduras

---

## 1. Tabla de Contenidos

1. [Descripción del Proyecto](#1-descripción-del-proyecto)
2. [Arquitectura General](#2-arquitectura-general)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Estructura del Directorio](#4-estructura-del-directorio)
5. [Autenticación y Autorización](#5-autenticación-y-autorización)
6. [Multi-Tenancy](#6-multi-tenancy)
7. [Base de Datos](#7-base-de-datos)
8. [Módulos del Sistema](#8-módulos-del-sistema)
9. [Rutas de la Aplicación](#9-rutas-de-la-aplicación)
10. [API Endpoints](#10-api-endpoints)
11. [Componentes](#11-componentes)
12. [Servicios y Utilidades](#12-servicios-y-utilidades)
13. [Integraciones Externas](#13-integraciones-externas)
14. [Variables de Entorno](#14-variables-de-entorno)
15. [Deploy y Configuración](#15-deploy-y-configuración)
16. [Estado Actual del Código](#16-estado-actual-del-código)
17. [Matriz del Plan de Implementación](#17-matriz-del-plan-de-implementación-por-etapas)

---

## 1. Descripción del Proyecto

**Contab** es un sistema contable profesional multi-tenant diseñado para empresas hondureñas. Ofrece gestión contable completa, facturación con cumplimiento fiscal SAR, inventario, compras, recursos humanos, y reportes financieros — todo en una plataforma cloud con autenticación segura y aislamiento por tenant.

### Características Principales

- **Multi-tenant:** Aislamiento completo de datos por empresa con Row Level Security (RLS)
- **Cumplimiento Fiscal Honduras:** ISV 15%/18%, retenciones 1%/12.5%, CAI, DET, Formulario SAR 221
- **Contabilidad Doble Entrada:** Catálogo de cuentas jerárquico, pólizas, libros contables
- **Facturación Electrónica:** Generación de facturas con CAI, notas de crédito/débito
- **Gestión de Inventario:** Productos, movimientos, stock, valoración
- **Recursos Humanos:** Empleados, asistencia, vacaciones, nómina
- **Reportes Financieros:** Balance General, Estado de Resultados, Flujo de Efectivo
- **RBAC:** 7 roles con 30+ permisos granulares
- **Pagos:** Integración con Stripe y PayPal

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                     │
│  React 19 + TypeScript + Tailwind CSS + Radix UI        │
│  Recharts + Tremor (Dashboard)                           │
├─────────────────────────────────────────────────────────┤
│                    MIDDLEWARE                              │
│  Clerk Auth + Tenant Resolution + Audit + Period Lock    │
├─────────────────────────────────────────────────────────┤
│                    API ROUTES (Next.js)                    │
│  Server Actions + API Handlers                           │
├─────────────────────────────────────────────────────────┤
│                    SERVICES LAYER                         │
│  Business Logic + Tax Calculations + Reporting           │
├─────────────────────────────────────────────────────────┤
│                    DATA LAYER                              │
│  Prisma ORM + Supabase Client                            │
├─────────────────────────────────────────────────────────┤
│                    DATABASE                                │
│  PostgreSQL (Supabase) + RLS + Views + Triggers          │
├─────────────────────────────────────────────────────────┤
│                    EXTERNAL SERVICES                       │
│  Clerk Auth + Stripe/PayPal + Google Vision OCR          │
│  Resend Email + Web Push                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Stack Tecnológico

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 16.2.9 | Framework React con App Router |
| React | 19.2.6 | UI Library |
| TypeScript | 5.7.3 | Tipado estático |
| Tailwind CSS | — | Estilos utility-first |
| Radix UI | — | Primitivos de UI (dialog, dropdown, tabs, etc.) |
| Tremor | 4.0.0-beta | Componentes de dashboard |
| Recharts | — | Gráficos y visualización |
| Lucide React | — | Iconografía |
| cmdk | — | Command palette |
| react-hook-form | 7.72.0 | Formularios |
| Zod | 4.3.6 | Validación de esquemas |

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Prisma | 5.20.0 | ORM para PostgreSQL |
| Supabase JS | 2.105.4 | Cliente Supabase |
| @supabase/ssr | 0.10.3 | Supabase SSR |
| pg | 8.20.0 | PostgreSQL driver |
| bcrypt/bcryptjs | — | Hashing de contraseñas |

### Pagos
| Tecnología | Versión | Uso |
|---|---|---|
| Stripe | 22.6.0 | Procesamiento de pagos |
| @stripe/react-stripe-js | 6.8.2 | Componentes Stripe |
| @paypal/react-paypal-js | 10.4.0 | Pagos PayPal |

### Reportes/Exportación
| Tecnología | Versión | Uso |
|---|---|---|
| @react-pdf/renderer | 4.3.2 | Generación PDF React |
| jspdf | 4.2.1 | PDF client-side |
| html2canvas | 1.4.1 | HTML a canvas |
| xlsx (SheetJS) | — | Procesamiento Excel |
| papaparse | 5.5.3 | Parsing CSV |

### Otros
| Tecnología | Uso |
|---|---|
| google-auth-library | OCR (Google Cloud Vision) |
| svix | Verificación de webhooks |
| qrcode | Generación de códigos QR |
| @react-email/render | Plantillas de correo |
| web-push (VAPID) | Notificaciones push |

---

## 4. Estructura del Directorio

```
contab/
├── app/                    # Next.js App Router (páginas y API routes)
│   ├── auth/               # Autenticación (login, register, callback)
│   ├── dashboard/          # Dashboard principal
│   ├── accounting/         # Módulo contable
│   ├── reports/            # Reportes financieros
│   ├── billing/            # Facturación
│   ├── inventory/          # Inventario
│   ├── companies/          # Gestión multi-tenant
│   ├── admin/              # Panel de administración
│   ├── support/            # Panel de soporte
│   ├── api/                # API routes (100+ endpoints)
│   └── ...                 # Otras páginas
├── components/             # Componentes React
│   ├── ui/                 # Componentes base (button, card, dialog, etc.)
│   ├── accounting/         # Componentes contables
│   ├── billing/            # Componentes de facturación
│   ├── dashboard/          # Widgets de dashboard
│   ├── financial/          # Componentes financieros
│   ├── financials/         # Estados financieros
│   ├── inventory/          # Componentes de inventario
│   ├── legal/              # Libros legales
│   ├── reports/            # Componentes de reportes
│   ├── sales/              # Componentes de ventas
│   ├── purchasing/         # Componentes de compras
│   ├── security/           # Componentes de seguridad
│   └── ...                 # Otros componentes
├── lib/                    # Utilidades y lógica de negocio
│   ├── actions/            # Server actions
│   ├── services/           # Servicios (25+ archivos)
│   ├── reports/            # Generación de reportes
│   ├── tax/                # Configuración fiscal
│   ├── billing/            # Generación de facturas
│   ├── hooks/              # Custom hooks (15+ hooks)
│   ├── contexts/           # React contexts
│   ├── constants/          # Constantes
│   └── validations/        # Schemas de validación Zod
├── hooks/                  # Custom hooks raíz
├── types/                  # Definiciones TypeScript
├── prisma/                 # Schema Prisma + migraciones
├── supabase/               # SQL scripts (tablas, vistas, RLS)
├── scripts/                # Scripts de setup y migración
│   └── migrations/         # 47 archivos de migración
├── docs/                   # Documentación (13 archivos MD)
├── templates/              # Plantillas HTML
├── styles/                 # CSS personalizado
├── public/                 # Assets estáticos
├── middleware.ts           # Middleware de autenticación
├── next.config.js          # Configuración Next.js
├── tailwind.config.ts      # Configuración Tailwind
├── tsconfig.json           # Configuración TypeScript
├── vercel.json             # Configuración de deploy
└── package.json            # Dependencias y scripts
```

---

## 5. Autenticación y Autorización

### Proveedor de Auth: Clerk

```typescript
// Provider en layout.tsx
<ClerkProvider>
  {children}
</ClerkProvider>
```

### Flujo de Autenticación

```
1. Usuario visita /auth/login → Clerk sign-in
2. Usuario visita /auth/register → Clerk sign-up
3. Auth exitosa → Clerk crea sesión
4. /auth/callback procesa OAuth callback
5. Webhook /api/webhook/clerk sincroniza usuario a DB:
   - user.created → Crea usuario en Prisma
   - user.updated → Actualiza usuario
   - user.deleted → Elimina usuario
6. Rol almacenado en Clerk publicMetadata.role
7. Tenant ID almacenado en Clerk publicMetadata.tenantId
```

### Sistema de Roles (7 niveles)

| Nivel | Rol | Permisos |
|---|---|---|
| 100 | SUPER_ADMIN | Acceso total al sistema |
| 80 | SUPPORT | Soporte técnico |
| 60 | ADMIN | Administración del tenant |
| 50 | MANAGER | Gestión de equipo |
| 40 | ACCOUNTANT | Contabilidad y reportes |
| 20 | USER | Operaciones básicas |
| 10 | VIEWER | Solo lectura |

### Sistema de Permisos (30+ permisos)

**Dominio Global:**
- `tenants:manage`, `users:global_manage`, `system:config`, `audit:view_global`

**Dominio Tenant:**
- `users:tenant_manage`, `tenant:config`, `billing:manage`

**Dominio Contabilidad:**
- `accounting:manage`, `accounting:view`, `closing:manage`, `financial_statements:view`

**Dominio Facturación:**
- `invoices:create`, `invoices:view`, `cai:manage`

**Dominio Inventario:**
- `inventory:view`, `inventory:manage`, `inventory:movements`

**Dominio Compras:**
- `purchases:view`, `purchases:manage`

**Dominio Fiscal:**
- `tax:config`, `tax:view`, `det:manage`

**Dominio Reportes:**
- `reports:financial`, `reports:support`

**Dominio Soporte:**
- `support:tickets`, `support:reset_password`

### Seguridad de Login

- Rate limiting: 5 intentos por ventana de 15 minutos
- Bloqueo: 30 minutos después de exceder límite
- Almacenamiento: In-memory (requiere Redis para producción)

---

## 6. Multi-Tenancy

### Arquitectura

Modelo **shared-database, shared-schema** con `tenantId` como clave de aislamiento.

### Aislamiento de Datos

| Capa | Mecanismo |
|---|---|
| **Supabase** | Row Level Security (RLS) en todas las tablas |
| **Prisma** | Filtro `tenantId` en todas las queries |
| **API Routes** | Header `x-tenant-id` o query param `tenantId` |
| **Frontend** | `TenantContext` con switcher de empresa |

### Tenant Context

```typescript
// lib/contexts/TenantContext.tsx
TenantProvider → Envuelve toda la app
- Tenants cargados desde /api/tenants-api
- Tenant actual persistido en localStorage
- Switching vía setTenant()
- Datos: id, businessName, tenantCode, businessRTN, modules
```

### Impersonación (Super Admin)

- Super admins pueden "impersonar" tenants vía cookie `impersonated_tenant_id`
- Duración: 30 minutos
- `exitImpersonation()` limpia cookies y redirige a `/admin/tenants`

### Planes de Suscripción

| Plan | Usuarios | Almacenamiento | Módulos |
|---|---|---|---|
| BASIC | Configurable | Configurable | Básicos |
| PRO | Configurable | Configurable | Avanzados |
| ENTERPRISE | Configurable | Configurable | Todos |

---

## 7. Base de Datos

### Prisma Schema (16 modelos)

| Modelo | Descripción |
|---|---|
| `Account` | Catálogo de cuentas (id, tenantId, name, code, type, parentId) |
| `Transaction` | Transacciones contables (date, description, voucherType, currency) |
| `JournalEntry` | Asientos de doble entrada (accountId, amount BigInt) |
| `Tenant` | Empresas (businessName, RTN, modules, subscription) |
| `User` | Usuarios (email, role, tenantId) |
| `CAI` | Autorizaciones de facturación (cai, ranges, expiry) |
| `Invoice` | Facturas (invoiceNumber, customerRTN, tax, total) |
| `InvoiceItem` | Líneas de factura (quantity, unitPrice, taxAmount) |
| `Plan` | Planes de suscripción |
| `SystemConfig` | Configuración del sistema |
| `File` | Gestión de archivos |
| `FileProcessing` | Estado de procesamiento |
| `FileTemplate` | Plantillas de archivos |
| `FileActivity` | Log de actividad |
| `CompanyLogo` | Logos de empresa |
| `SupportTicket` | Tickets de soporte |

### Supabase SQL Tables (30+ tablas)

**Core:** Tenant, Plan, User, Account, Transaction, JournalEntry

**Facturación:** Invoice, InvoiceItem, cai, talonarios, customer, invoice (lowercase)

**Contabilidad:** chart_of_accounts, account_audit_log, auditlog

**Inventario:** products, warehouses, inventory_movements

**Compras:** Supplier, PurchaseOrder, PurchaseOrderItem, AccountPayable

**RRHH:** employees, employee_history, employee_hr_documents, departments, positions, permission_types, permission_usage, permission_requests

**Fiscal:** custom_taxes, withholding

**Soporte:** SupportTicket, ticket_attachments, ticket_email_logs

**Archivos:** File, FileProcessing, FileTemplate, FileActivity, CompanyLogo

### Supabase SQL Views (15 vistas)

| Vista | Descripción |
|---|---|
| `balance_general` | Balance General |
| `estado_resultados` | Estado de Resultados |
| `balanza_comprobacion` | Balanza de Comprobación |
| `libro_diario` | Libro Diario |
| `libro_mayor` | Libro Mayor |
| `libro_ventas` | Libro de Ventas |
| `libro_compras` | Libro de Compras |
| `resumen_isv` | Resumen ISV |
| `declaracion_mensual` | Declaración Mensual SAR |
| `top_clientes` | Top Clientes |
| `flujo_efectivo_mensual` | Flujo de Efectivo Mensual |
| `resumen_contable` | Resumen Contable |
| `inventario_valorizado` | Inventario Valorizado |
| `cuentas_por_cobrar` | Cuentas por Cobrar |
| `cuentas_por_pagar` | Cuentas por Pagar |

### Migraciones

- **Prisma:** 17 migraciones en `prisma/migrations/`
- **Supabase SQL:** 47 archivos en `scripts/migrations/`

---

## 8. Módulos del Sistema

### Resumen de Estado

| # | Módulo | Completitud | Estado |
|---|---|---|---|
| 1 | Contabilidad (Registro + Estados Financieros + Libros Legales) | ~72% | Parcial |
| 2 | Facturación y Ventas | ~55% | Parcial |
| 3 | Inventario | ~55% | Parcial |
| 4 | Compras y Proveedores | ~35% | Básico |
| 5 | Control Financiero | ~35% | Parcial |
| 6 | Reportes y Análisis | ~75% | Completo |
| 7 | Seguridad y Control | ~80% | Completo |
| 8 | Otras Características | ~35% | Básico |
| 9 | Integración Fiscal | ~55% | Parcial |
| 10 | Recursos Humanos | ~95% | Completo |

**Promedio General: ~68%**

### Detalle por Módulo

#### 8.1 Contabilidad (~72%)
- ✅ Catálogo de cuentas jerárquico (3 plantillas: PYME, Comercial, Servicios)
- ✅ Tipos de comprobante (INGRESO, EGRESO, DIARIO, AJUSTE)
- ✅ Libros contables (Diario, Mayor, Balance, Ingresos, Egresos)
- ✅ Auditoría con middleware Prisma
- ✅ **Auditoría inmutable de cuentas** — Tabla `account_audit_log` (acción, valores anteriores/nuevos JSONB, usuario, fecha). API `/api/accounting/audit-logs` con paginación y filtros. UI `/accounting/audit` agrupada por día con expand/collapse. Backfill automático de cuentas.
- ✅ Estados Financieros: Balance General, Estado de Resultados, Flujo de Efectivo, Balance de Comprobación
- ✅ Libros Legales: Libro de Compras, Ventas, Retenciones, CAI
- ✅ Dashboard unificado con acceso a las 3 áreas (Registro Contable, Estados Financieros, Libros Legales)
- ✅ Balances de Apertura — Página CRUD + botón "Calcular desde Movimientos" con matching flexible de códigos
- ✅ Balance de Comprobación 6 columnas (Saldo Anterior / Movimientos / Saldo Actual)
- ✅ Performance optimizado (fetches paralelos)
- ⚠️ Formulario de asientos no conectado a API (usa mock data)
- ⚠️ Hook use-accounts retorna datos mock

#### 8.2 Estados Financieros (~60%)
- ✅ Balance General con datos Supabase
- ✅ Estado de Resultados con datos Supabase
- ✅ Flujo de Efectivo con datos Supabase
- ⚠️ Componente FinancialStatements usa mock data
- ❌ Sin exportación Excel/PDF real
- ❌ Sin dashboard de ratios financieros

#### 8.3 Libros Legales (~65%)
- ✅ Libro de Compras y Ventas con CSV export
- ✅ Formulario SAR 221 (ISV)
- ✅ Exportación DET (archivo .txt formato SAR)
- ✅ Retenciones con recibo PDF (1% y 12.5%)
- ❌ Sin DIAT
- ❌ Sin declaraciones anuales

#### 8.4 Facturación y Ventas (~55%)
- ✅ CRUD de facturas con ISV
- ✅ Gestión de clientes con RTN
- ✅ Gestión CAI con alertas
- ✅ Dashboard de ventas
- ⚠️ Dual schema (invoice lowercase + Invoice PascalCase)
- ❌ Sin notas de crédito/débito
- ❌ Sin cotizaciones/proformas
- ❌ Sin generación de PDF

#### 8.5 Inventario (~55%)
- ✅ CRUD de productos con categorías
- ✅ Movimientos (IN/OUT/ADJUSTMENT) con trigger automático
- ✅ Importación CSV/Excel
- ✅ Reportes de inventario
- ⚠️ Dual schema (Product PascalCase + product lowercase)
- ❌ Sin multi-almacén funcional
- ❌ Sin valoración FIFO/promedio
- ❌ Sin inventario físico

#### 8.6 Compras y Proveedores (~35%)
- ✅ Dashboard de compras con charts
- ✅ Libro de compras legal
- ⚠️ API de compras usa JSON files (no DB)
- ⚠️ API de proveedores usa JSON files
- ❌ Sin formulario de órdenes de compra
- ❌ Sin devoluciones
- ❌ Sin matching 3 vías

#### 8.7 Control Financiero (~35%)
- ✅ Proyección de flujo de caja (30 días)
- ✅ Punto de equilibrio
- ⚠️ Conciliación bancaria parcial
- ⚠️ Multi-divisa con datos hardcodeados
- ❌ Sin presupuestos
- ❌ Sin centros de costo
- ❌ Sin caja chica

#### 8.8 Reportes y Análisis (~75%)
- ✅ Centro de reportes (18 reportes, 4 categorías)
- ✅ 11 API routes de reportes
- ✅ 5+ componentes de charts (Recharts + Tremor)
- ✅ Exportación CSV completa
- ❌ Sin exportación Excel
- ❌ PDF es placeholder
- ❌ Sin reportes programados

#### 8.9 Seguridad y Control (~80%)
- ✅ Autenticación Clerk completa
- ✅ RBAC con 7 roles y 30+ permisos
- ✅ Gestión de usuarios CRUD
- ✅ Auditoría en tiempo real
- ⚠️ Multi-tenant con RLS parcial
- ⚠️ Rate limiting in-memory
- ❌ Sin 2FA

#### 8.10 Otras Características (~35%)
- ✅ Importación Excel para 9 bancos hondureños
- ✅ Carga de archivos a Supabase Storage
- ⚠️ Correo electrónico simulado
- ⚠️ Push notifications sin configurar
- ❌ Sin backup/restore
- ❌ PDF es placeholder

#### 8.11 Integración Fiscal (~55%)
- ✅ ISV 15%/18% con auto-categorización
- ✅ Retenciones 1%/12.5% con PDF legal
- ✅ CAI con alertas de rango/vencimiento
- ✅ Declaraciones mensuales SAR
- ✅ ISR con escalas progresivas Honduras
- ❌ Sin DIAT
- ❌ Sin DIN ni TCA
- ❌ Sin impresora fiscal
- ❌ Sin envío en línea SAR

#### 8.12 Recursos Humanos (~55%)
- ✅ Gestión de empleados (CRUD completo)
- ✅ Departamentos y cargos jerárquicos
- ✅ Control de asistencia (9 estados)
- ✅ Gestión de vacaciones y permisos
- ⚠️ Asistencia, vacaciones, planilla usan localStorage
- ❌ Sin planilla persistente en BD
- ❌ Sin Planes de Mejoramiento (PIP)

---

## 9. Rutas de la Aplicación

### Autenticación
- `/auth/login` — Inicio de sesión
- `/auth/register` — Registro
- `/auth/callback` — Callback OAuth
- `/auth/sign-in/[...rest]` — Clerk sign-in
- `/auth/sign-up/[...rest]` — Clerk sign-up
- `/auth/reset-password` — Restablecer contraseña

### Dashboard
- `/dashboard` — Dashboard principal

### Contabilidad
- `/accounting` — Hub contable
- `/accounting/accounts` — Catálogo de cuentas
- `/accounting/journal` — Asientos contables
- `/accounting/books` — Libros contables
- `/accounting/reports` — Reportes contables
- `/accounting/taxes` — Gestión de impuestos

### Reportes
- `/reports` — Centro de reportes
- `/reports/balance-general` — Balance General
- `/reports/estado-resultados` — Estado de Resultados
- `/reports/flujo-efectivo` — Flujo de Efectivo
- `/reports/trial-balance` — Balanza de Comprobación
- `/reports/libro-diario` — Libro Diario
- `/reports/resumen-isv` — Resumen ISV
- `/reports/declaracion-mensual` — Declaración Mensual
- `/reports/top-clientes` — Top Clientes

### Facturación
- `/billing` — Hub de facturación
- `/billing/[id]` — Detalle de factura
- `/billing/generate-invoice` — Generar factura
- `/billing/config` — Configuración

### Inventario
- `/inventory` — Gestión de inventario

### Contactos
- `/contacts` — Gestión de contactos

### Transacciones
- `/transactions` — Transacciones financieras

### Multi-Divisa
- `/multi-currency` — Soporte multi-divisa

### Import/Export
- `/import-export` — Centro de importación/exportación

### DET
- `/det` — Documento Electrónico Tributario

### Retenciones
- `/withholding` — Gestión de retenciones

### CIERRE
- `/closing` — Cierre de período

### CAI
- `/cai` — Gestión de CAI

### Empresas (Dinámicas)
- `/companies` — Listado de empresas
- `/companies/[id]` — Detalle de empresa
- `/companies/[id]/hr` — Recursos Humanos
- `/companies/[id]/hr/employees` — Empleados
- `/companies/[id]/hr/attendance` — Asistencia
- `/companies/[id]/hr/payroll` — Nómina
- `/companies/[id]/hr/vacations` — Vacaciones
- `/companies/[id]/purchases` — Compras
- `/companies/[id]/inventory` — Inventario
- `/companies/[id]/security` — Seguridad

### Admin
- `/admin` — Panel de administración
- `/admin/dashboard` — Dashboard admin
- `/admin/users` — Gestión de usuarios
- `/admin/tenants` — Gestión de tenants
- `/admin/plans` — Planes de suscripción

### Soporte
- `/support` — Panel de soporte
- `/support/dashboard` — Dashboard soporte
- `/support/tickets` — Tickets

### Cuenta
- `/account/profile` — Perfil de usuario
- `/account/settings` — Configuración

---

## 10. API Endpoints

### Resumen

| Dominio | Endpoints | Métodos |
|---|---|---|
| Auth | 5 | POST, GET |
| Admin Users | 8 | GET, POST, PUT, DELETE |
| Admin Tenants | 8 | GET, POST, PUT, DELETE |
| Admin Other | 12 | GET, POST |
| Tenant | 5 | GET |
| Accounting | 10 | GET, POST |
| Billing | 20+ | GET, POST, PUT, DELETE |
| Reports | 11 | GET |
| Tax | 14 | GET, POST, PUT, DELETE |
| ISV | 3 | POST, GET |
| Withholding | 2 | GET, POST |
| Inventory | 6 | GET, POST |
| Purchases | 8 | GET, POST, PUT, DELETE |
| Bank | 2 | GET, POST |
| Financial | 5 | GET, POST |
| Import/Export | 2 | POST |
| DET | 1 | GET, POST |
| Support | 10 | GET, POST |
| Audit | 1 | GET, POST |
| Health | 1 | GET |
| Debug | 6 | GET |
| Setup | 6 | POST |
| **TOTAL** | **~130+** | — |

### Endpoints Principales

#### Contabilidad
- `GET/POST /api/accounting/accounts` — CRUD cuentas
- `GET/POST /api/accounting/transactions` — CRUD transacciones
- `GET /api/accounting/integrated-books` — Libros integrados
- `GET /api/accounting/trial-balance` — Balanza
- `GET /api/accounting/general-ledger` — Libro mayor
- `GET /api/accounting/voucher-number` — Número de comprobante

#### Facturación
- `GET/POST /api/billing/invoices` — CRUD facturas
- `GET/POST /api/billing/customers` — CRUD clientes
- `GET /api/billing/cai` — Gestión CAI
- `GET/POST /api/billing/products` — Productos

#### Reportes
- `GET /api/reports/balance-general`
- `GET /api/reports/estado-resultados`
- `GET /api/reports/flujo-efectivo`
- `GET /api/reports/libro-diario`
- `GET /api/reports/libro-ventas`
- `GET /api/reports/libro-compras`
- `GET /api/reports/resumen-isv`
- `GET /api/reports/declaracion-mensual`
- `GET /api/reports/top-clientes`
- `GET /api/reports/pnl`

#### Fiscal
- `GET/POST /api/tax-config` — Configuración impuestos
- `POST /api/tax-helper/process` — Procesar impuestos
- `POST /api/isv/calculate` — Calcular ISV
- `GET /api/isv/summary` — Resumen ISV
- `GET/POST /api/withholding` — Retenciones
- `GET/POST /api/det` — DET

#### Inventario
- `GET/POST /api/inventory/products` — Productos
- `GET/POST /api/inventory/movements` — Movimientos
- `GET/POST /api/inventory/warehouses` — Almacenes

#### Compras
- `GET/POST /api/purchases` — Compras
- `GET/POST /api/purchase-orders` — Órdenes
- `GET/POST /api/suppliers` — Proveedores

---

## 11. Componentes

### Componentes UI Base (components/ui/)
- `button.tsx`, `card.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `badge.tsx`, `avatar.tsx`, `checkbox.tsx`, `popover.tsx`, `progress.tsx`, `separator.tsx`, `collapsible.tsx`, `command.tsx`, `modal.tsx`, `currency-input.tsx`

### Componentes de Dominio

| Categoría | Componentes | Cantidad |
|---|---|---|
| **Accounting** | ChartOfAccountsManager, JournalEntryForm, AccountingBooks, FinancialStatements, SARForm221, TransactionFormSimple | 12 |
| **Billing** | InvoiceForm, CustomerManager, AccountsReceivableManager, SalesDashboard, InvoicePreview, PaymentLinkGenerator | 8 |
| **Dashboard** | AuditFeed, BreakEvenChart, BurnRateChart, CAIDashboard, CashFlowProjectionChart, CompanySwitcher, InventoryStats, InvoiceStats, PurchasesStats, WithholdingDashboard | 14 |
| **Financial** | BankAccountManager, BankReconciliation, CashFlowManager | 3 |
| **Financial Statements** | BalanceSheet, CashFlowStatement, IncomeStatement | 3 |
| **Inventory** | InventoryManager, InventoryReports | 2 |
| **Legal** | PurchaseBook, SalesBook, InventoryBalanceBook | 3 |
| **Reports** | FinancialReports, PDFDownloadLink, PnLPDF, SignatureBlock, TrialBalanceDocument, WithholdingReceiptPDF | 6 |
| **Sales** | InvoiceForm, CustomerManager, AccountsReceivableManager, SalesDashboard | 4 |
| **Purchasing** | PurchaseOrdersManager, SupplierManager, PaymentManager, PurchasesDashboard | 4 |
| **Security** | UserManagement | 1 |
| **Standalone** | RoleBasedSidebar, RoleGuard, WithholdingManager, TaxHelperForm, DETExportManager, YearEndClosing, OCRInvoiceScanner | 15+ |

**Total: ~80+ componentes**

---

## 12. Servicios y Utilidades

### Servicios Principales (lib/services/)

| Servicio | Archivo | Descripción |
|---|---|---|
| Auditoría | `audit-service.ts` | CRUD de logs de auditoría |
| CAI | `cai-service.ts` | Gestión de autorizaciones de facturación |
| Flujo de Caja | `cash-flow-projection-service.ts` | Proyecciones 30 días (594 líneas) |
| Multi-Divisa | `multi-currency.ts`, `multi-currency-server.ts` | Conversión y validación |
| DET | `det-live-core.ts`, `det-live-service.ts` | Formato SAR 262 caracteres |
| Excel Import | `excel-import.ts` | Importación de cuentas y transacciones |
| Banco Mapper | `bank-excel-mapper.ts` | Detección de 9 bancos hondureños |
| ISV | `isv-service.ts` | Cálculo de impuesto sobre ventas |
| Retenciones | `withholding-service.ts` | CRUD y cálculo de retenciones |
| Impuestos | `tax-config.ts`, `tax-helper.ts`, `tax-reporting.ts` | Configuración y reportes fiscales |
| PDF Export | `pdf-export.ts` | Generación HTML para PDF |
| OCR | `ocr-service.ts` | Procesamiento de imágenes |
| Cierre | `year-end-closing.ts` | Cierre contable anual |
| Archivos | `file-service.ts` | Gestión de archivos |

### Utilidades (lib/)

| Utilidad | Archivo | Descripción |
|---|---|---|
| Auth | `auth.ts`, `auth-server.ts`, `auth-middleware.ts` | Autenticación |
| Permisos | `permissions.ts` | Sistema RBAC (256 líneas) |
| Tenant | `tenant-utils.ts` | Helpers de multi-tenancy |
| Moneda | `currency-utils.ts` | Formato de moneda |
| Fechas | `date-utils.ts` | Utilidades de fecha (Honduras) |
| Comprobantes | `voucher-types.ts`, `voucher-categorization.ts` | Tipos de comprobante |
| Contabilidad | `accounting-utils.ts` | Utilidades contables |
| Auditoría | `audit-context.ts`, `audit-middleware.ts` | Middleware de auditoría |
| Períodos | `period-lock-middleware.ts` | Bloqueo de períodos |
| Seguridad | `login-security.ts` | Rate limiting |

### Hooks (lib/hooks/)

| Hook | Descripción |
|---|---|
| `useTenantSupabase` | Gestión de tenant con Supabase |
| `useBalanceGeneral` | Datos de Balance General |
| `useEstadoResultados` | Datos de Estado de Resultados |
| `useBalanzaComprobacion` | Datos de Balanza |
| `useLibroDiario` | Datos de Libro Diario |
| `useLibroVentas` | Datos de Libro de Ventas |
| `useLibroCompras` | Datos de Libro de Compras |
| `useResumenISV` | Datos de Resumen ISV |
| `useDeclaracionMensual` | Datos de Declaración Mensual |
| `useTopClientes` | Datos de Top Clientes |
| `useInventarioValorizado` | Datos de Inventario |
| `useCuentasPorCobrar` | Cuentas por Cobrar |
| `useCuentasPorPagar` | Cuentas por Pagar |
| `useFlujoEfectivo` | Datos de Flujo de Efectivo |
| `useResumenContable` | Resumen Contable |

---

## 13. Integraciones Externas

| Servicio | Propósito | Estado |
|---|---|---|
| **Clerk** | Autenticación y gestión de usuarios | ✅ Activo |
| **Supabase** | PostgreSQL + RLS + Storage | ✅ Activo |
| **Prisma** | ORM para database | ✅ Activo |
| **Stripe** | Procesamiento de pagos | ✅ Activo |
| **PayPal** | Pagos alternativos | ✅ Activo |
| **Google Cloud Vision** | OCR de facturas | ✅ Activo |
| **React Email** | Plantillas de correo | ⚠️ Simulado |
| **Web Push (VAPID)** | Notificaciones push | ⚠️ Stub |
| **Svix** | Verificación de webhooks | ✅ Activo |
| **SheetJS (xlsx)** | Procesamiento Excel | ✅ Activo |
| **PapaParse** | Parsing CSV | ✅ Activo |
| **@react-pdf/renderer** | Generación PDF | ✅ Activo |
| **Recharts** | Gráficos | ✅ Activo |
| **Tremor** | Dashboard UI | ✅ Activo |
| **Vercel** | Hosting/Deploy | ✅ Activo |

---

## 14. Variables de Entorno

### Requeridas

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL=/auth/login

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
POSTGRES_SCHEMA=public
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

### Opcionales

```env
# Clerk Webhook
CLERK_WEBHOOK_SECRET=whsec_...

# Super Admins
NEXT_PUBLIC_SUPER_ADMIN_EMAILS=admin@example.com

# Stripe
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Google Cloud Vision (OCR)
GOOGLE_CLOUD_PROJECT_ID=...
GOOGLE_CLOUD_API_KEY=...
GOOGLE_CLOUD_KEY_JSON=...

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Email
RESEND_API_KEY=re_...
```

---

## 15. Deploy y Configuración

### Vercel

```json
{
  "crons": [
    {
      "path": "/api/admin/billing/auto-generate-invoices",
      "schedule": "0 0 1 * *"
    }
  ],
  "installCommand": "npm install --legacy-peer-deps"
}
```

### Scripts de Build

```json
{
  "dev": "next dev",
  "build": "prisma generate && next build",
  "start": "next start",
  "lint": "next lint",
  "email": "email dev",
  "prisma.seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

### Configuración Next.js

- **Output:** `standalone` (para Vercel/Docker)
- **TypeScript:** Errores ignorados en build
- **Turbopack:** Habilitado
- **Server Actions:** Límite de 10MB

### Configuración Tailwind

- Dark mode: `class`-based
- Brand colors: `brand-cyan` (600) y `brand-lime`
- Tema CSS variables (shadcn/ui style)
- Container: centrado, 2rem padding, max-width 1400px

---

## 16. Estado Actual del Código

### 16.1 Resumen Ejecutivo por Módulo

| # | Módulo | Completitud | UI Pages | API Routes | DB Tables | Almacenamiento | Estado |
|---|---|---|---|---|---|---|---|
| 1 | Contabilidad (Registro + EF + LL) | ~72% | 15 | 24 | 3 tablas + 5 vistas + 4 tablas legales | Supabase + Prisma | Parcial |
| 2 | Control de Asistencia | ~95% | 1 (4 tabs) | 7 | 5 tablas | Supabase | Completo |
| 3 | Facturación y Ventas | ~55% | 3 | 12 | 6 tablas (dual schema) | Supabase + Prisma | Parcial |
| 4 | Inventario | ~55% | 1 | 5 | 4 tablas (dual schema) | Supabase | Parcial |
| 5 | Compras y Proveedores | ~35% | 2 | 6 | 4 tablas | **JSON files** | **Básico** |
| 6 | Control Financiero | ~35% | 1 | 3 | 1 tabla | Supabase + Prisma | Parcial |
| 7 | Reportes y Análisis | ~75% | 9 | 11 | 15 vistas | Supabase | Completo |
| 8 | Seguridad y Control | ~80% | 1 | 2 | 4 tablas | Supabase + Prisma | Completo |
| 9 | Otras Características | ~35% | 1 | 2 | 6 tablas (Prisma) | Supabase Storage | Básico |
| 10 | Integración Fiscal | ~55% | 5 | 14 | 4 tablas + 2 vistas | Supabase + Prisma | Parcial |
| 11 | Recursos Humanos | ~95% | 5 | 16 | 29 tablas | Supabase | Completo |

### 16.2 Métricas de Madurez

| Métrica | Valor Actual | Objetivo | Brecha |
|---|---|---|---|
| Completitud Funcional | ~67% | 95% | -28% |
| Cobertura de Pruebas | 0% | 70% | -70% |
| Persistencia de Datos | ~80% | 100% | -20% |
| Integración entre Módulos | ~55% | 80% | -25% |
| Exportación (PDF/Excel) | ~30% | 90% | -60% |
| Cumplimiento Fiscal Honduras | ~50% | 95% | -45% |
| Documentación y Tipado | ~20% | 70% | -50% |

### 16.3 Visualización de Progreso

```
MÓDULO                        PROGRESO                              ESTADO
─────────────────────────────────────────────────────────────────────────────
1.  Contabilidad              █████████████████████░░░░░░░░░  72%  Parcial
    (Registro + EF + LL)
2.  Facturación y Ventas      ██████████████░░░░░░░░░░░░░░░░  55%  Parcial
3.  Inventario                ██████████████░░░░░░░░░░░░░░░░  55%  Parcial
4.  Compras y Proveedores     █████████░░░░░░░░░░░░░░░░░░░░░  35%  Básico
5.  Control Financiero        █████████░░░░░░░░░░░░░░░░░░░░░  35%  Parcial
6.  Reportes y Análisis       ████████████████████░░░░░░░░░░  75%  Completo
7.  Seguridad y Control       █████████████████████░░░░░░░░░  80%  Completo
8.  Otras Características     █████████░░░░░░░░░░░░░░░░░░░░░  35%  Básico
9.  Integración Fiscal        ██████████████░░░░░░░░░░░░░░░░  55%  Parcial
10. Recursos Humanos          ███████████████████████░░░░░░░  95%  Completo
─────────────────────────────────────────────────────────────────────────────
PROMEDIO                      ███████████████████░░░░░░░░░░  68%
```

### 16.4 Estado de Almacenamiento de Datos

| Módulo | Supabase | Prisma | localStorage | JSON Files | Estado |
|---|---|---|---|---|---|
| Contabilidad (Registro + EF + LL) | ✅ | ✅ | — | — | ✅ Correcto |
| Control de Asistencia | ✅ | — | — | — | ✅ Correcto |
| Facturación y Ventas | ✅ | ✅ | — | — | ⚠️ Dual schema |
| Inventario | ✅ | — | — | — | ⚠️ Dual schema |
| Compras y Proveedores | Parcial | — | — | **⚠️ JSON** | ❌ Crítico |
| Control Financiero | ✅ | ✅ | — | — | ✅ Correcto |
| Reportes y Análisis | ✅ | — | — | — | ✅ Correcto |
| Seguridad y Control | ✅ | ✅ | — | — | ✅ Correcto |
| Otras Características | ✅ | ✅ | — | — | ✅ Correcto |
| Integración Fiscal | ✅ | ✅ | — | — | ✅ Correcto |
| Recursos Humanos | ✅ | — | — | — | ✅ Correcto |

### 16.5 Problemas Críticos Consolidados (Top 10)

| # | Problema | Módulos | Impacto | Prioridad |
|---|---|---|---|---|
| 1 | Compras y pagos almacenan en archivos JSON | Compras | Datos no persistentes | **Crítica** |
| 2 | Asistencia, vacaciones y planilla usan localStorage | RRHH | Datos no persistentes | **Crítica** |
| 3 | Sin DIAT (Declaración Informativa de Actividades) | Fiscal, Libros | Incumplimiento SAR | **Crítica** |
| 4 | Sin notas de crédito/débito con UI | Facturación | Incumplimiento fiscal | **Crítica** |
| 5 | JournalEntryForm usa mockData y no guarda | Contabilidad | Función principal rota | **Crítica** |
| 6 | FinancialStatements usa mockData | Estados Financieros | Componente inutilizable | **Crítica** |
| 7 | Sin presupuestos ni centros de costo | Control Financiero | Sin control presupuestario | Alta |
| 8 | Sin multi-almacén funcional | Inventario | Sin logística | Alta |
| 9 | Sin generación de PDF profesional | Múltiples | Sin impresión | Alta |
| 10 | RLS no confirmado en todas las tablas | Seguridad | Riesgo cross-tenant | Alta |

### 16.6 Fortalezas del Sistema

| Fortaleza | Módulo |
|---|---|
| Autenticación Clerk + RBAC 7 roles + 30+ permisos | Seguridad |
| Catálogo de cuentas jerárquico con 3 plantillas | Contabilidad |
| Centro de reportes con 18 reportes y 11 APIs | Reportes |
| Gestión CAI con alertas de rango y vencimiento | Fiscal/Facturación |
| Retenciones con recibo PDF A4 legal | Fiscal |
| Importación bancaria para 9 bancos hondureños | Otras |
| Proyección de flujo de caja 30 días ponderada | Control Financiero |
| Cálculos ISV 15%/18%, ISR progresivo, retenciones | Fiscal |

---

## 17. Matriz del Plan de Implementación por Etapas

### 17.1 Diagrama de Dependencias

```
                    ┌─────────────────────┐
                    │   8. SEGURIDAD       │
                    │   (Base transversal) │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼─────────┐ ┌───▼────────┐ ┌────▼──────────────┐
    │ 1. CONTABILIDAD    │ │ 3. FACTU-  │ │ 11. RECURSOS      │
    │ (Registro + EF +   │ │ RACIÓN     │ │     HUMANOS       │
    │  Libros Legales)   │ │            │ │                   │
    └─────────┬─────────┘ └───┬────────┘ └────┬──────────────┘
              │               │                │
    ┌─────────▼─────────┐ ┌───▼────────┐ ┌────▼──────────────┐
    │ 2. CONTROL DE      │ │ 4. INVEN-  │ │ 10. INTEGRACIÓN   │
    │    ASISTENCIA      │ │ TARIO      │ │     FISCAL        │
    └─────────┬─────────┘ └───┬────────┘ └────┬──────────────┘
              │               │                │
    ┌─────────▼─────────┐ ┌───▼────────┐ ┌────▼──────────────┐
    │ 5. COMPRAS Y       │ │ 6. REPORTES│ │ 7. CONTROL        │
    │    PROVEEDORES     │ │ Y ANÁLISIS │ │    FINANCIERO     │
    └───────────────────┘ └────────────┘ └───────────────────┘
```
                    │ (Consolida todo)   │
                    └───────────────────┘
```

### 17.2 Etapa 1: Consolidación de Datos y Conectividad (Semanas 1-6)

**Objetivo:** Eliminar localStorage/JSON, consolidar dual schemas, conectar componentes a API real.

| # | Tarea | Módulo | Archivos | Dependencias | Entregable |
|---|---|---|---|---|---|
| 1.1 | Crear tablas Supabase para asistencia HR | RRHH | `supabase/ATTENDANCE_TABLES.sql` | Ninguna | Tablas SQL |
| 1.2 | Crear tablas Supabase para planilla HR | RRHH | `supabase/PAYROLL_TABLES.sql` | Ninguna | Tablas SQL |
| 1.3 | Conectar UI vacaciones a Supabase | RRHH | `vacations/page.tsx` | Tablas existen | UI con BD |
| 1.4 | Crear APIs para asistencia HR | RRHH | `api/.../hr/attendance/route.ts` | 1.1 | API funcional |
| 1.5 | Crear APIs para planilla HR | RRHH | `api/.../hr/payroll/route.ts` | 1.2 | API funcional |
| 1.6 | Crear APIs para permisos HR | RRHH | `api/.../hr/permissions/route.ts` | 1.3 | API funcional |
| 1.7 | Migrar proveedores de JSON a Supabase | Compras | `api/suppliers/route.ts` | Ninguna | API con BD |
| 1.8 | Migrar compras de JSON a Supabase | Compras | `api/purchases/route.ts` | Ninguna | API con BD |
| 1.9 | Migrar pagos de JSON a Supabase | Compras | `api/supplier-payments/route.ts` | Ninguna | API con BD |
| 1.10 | Script de migración de datos JSON | Compras | `scripts/migrate-json-to-supabase.ts` | 1.7-1.9 | Migración |
| 1.11 | Consolidar schema de factura (lowercase vs PascalCase) | Facturación | Migraciones SQL | Ninguna | Schema único |
| 1.12 | Consolidar schema de producto (lowercase vs PascalCase) | Inventario | Migraciones SQL | Ninguna | Schema único |
| 1.13 | Conectar JournalEntryForm a API real | Contabilidad | `JournalEntryForm.tsx`, `use-accounts.ts` | Ninguna | Formulario funcional |
| 1.14 | Implementar guardado real en handleSubmit | Contabilidad | `JournalEntryForm.tsx` | 1.13 | Asientos guardados |
| 1.15 | Conectar FinancialStatements a datos reales | Estados Financieros | `FinancialStatements.tsx` | Ninguna | Componente funcional |
| 1.16 | Crear tipos TypeScript para entidades HR | RRHH | `types/hr.ts` | 1.1-1.2 | Tipos definidos |
| 1.17 | Crear tipos TypeScript para entidades contables | Contabilidad | `types/accounting.ts` | Ninguna | Tipos definidos |

**Entregable Etapa 1:** Todos los datos persistidos en Supabase; componentes conectados a API real.

### 17.3 Etapa 2: Funcionalidad Core y Cumplimiento Fiscal (Semanas 4-12)

**Objetivo:** Implementar DIAT, notas de crédito/débito, plantillas de asientos, validaciones.

| # | Tarea | Módulo | Archivos | Dependencias | Entregable |
|---|---|---|---|---|---|
| 2.1 | Implementar servicio de detección de atrasos | RRHH | `lib/services/attendance-service.ts` | Etapa 1 | Servicio |
| 2.2 | Implementar detección de horas extra y faltas | RRHH | `lib/services/attendance-service.ts` | 2.1 | Servicio |
| 2.3 | Implementar reglas de validación de asistencia | RRHH | `lib/services/attendance-service.ts` | 2.2 | Validaciones |
| 2.4 | Crear endpoint de consolidación diaria | RRHH | `api/.../daily-consolidation/route.ts` | 2.1-2.3 | Endpoint |
| 2.5 | Crear generador de DIAT | Fiscal | `lib/services/diat-generator.ts` | Etapa 1 | Generador |
| 2.6 | UI de DIAT | Fiscal | `app/diat/page.tsx` | 2.5 | Página |
| 2.7 | Crear notas de crédito | Facturación | `components/sales/CreditNoteForm.tsx` | Etapa 1 | Formulario |
| 2.8 | Crear notas de débito | Facturación | `components/sales/DebitNoteForm.tsx` | Etapa 1 | Formulario |
| 2.9 | API de notas de crédito/débito | Facturación | `api/billing/notes/route.ts` | 2.7-2.8 | API CRUD |
| 2.10 | Integrar notas con facturas y contabilidad | Facturación | `lib/services/notes-service.ts` | 2.9 | Integración |
| 2.11 | Crear sistema de plantillas de asientos | Contabilidad | `lib/services/journal-templates.ts` | Etapa 1 | Plantillas |
| 2.12 | Implementar importación masiva de asientos | Contabilidad | `lib/services/excel-import.ts` | Etapa 1 | Importación |
| 2.13 | Implementar asientos de reversión | Contabilidad | `lib/services/journal-reversal.ts` | Etapa 1 | Reversión |
| 2.14 | Asiento contable automático por retención | Fiscal | `lib/services/withholding-accounting.ts` | Etapa 1 | Asiento |
| 2.15 | Asiento contable automático por ISV | Fiscal | `lib/services/isv-accounting.ts` | Etapa 1 | Asiento |
| 2.16 | Motor de acumulación de vacaciones | RRHH | `lib/services/vacation-service.ts` | Etapa 1 | Servicio |
| 2.17 | Flujos de aprobación de permisos | RRHH | `lib/services/permission-service.ts` | 1.6 | Flujos |
| 2.18 | Crear tablas para PIP en Supabase | RRHH | `supabase/PIP_TABLES.sql` | Ninguna | Tablas SQL |
| 2.19 | Crear API para PIP | RRHH | `api/.../hr/pip/route.ts` | 2.18 | API CRUD |
| 2.20 | Crear UI de PIP | RRHH | `app/.../hr/pip/page.tsx` | 2.19 | Página |

**Entregable Etapa 2:** DIAT funcional, notas de crédito/débito, asientos contables automáticos, PIP básico.

### 17.4 Etapa 3: Exportación y Reporting (Semanas 8-16)

**Objetivo:** Exportación Excel, PDF profesional, comparativos de período, reportes avanzados.

| # | Tarea | Módulo | Archivos | Dependencias | Entregable |
|---|---|---|---|---|---|
| 3.1 | Servicio de exportación Excel | Reportes | `lib/services/excel-export.ts` | Ninguna | Servicio |
| 3.2 | Agregar botón Excel a cada reporte | Reportes | Múltiples componentes | 3.1 | Exportación |
| 3.3 | Generación PDF server-side | Reportes | `lib/services/pdf-export.ts` | Ninguna | PDF funcional |
| 3.4 | Plantillas de impresión por reporte | Reportes | `templates/reports/` | 3.3 | Plantillas |
| 3.5 | PDF de factura de venta | Facturación | `lib/services/invoice-pdf.ts` | 3.3 | PDF factura |
| 3.6 | Plantilla HTML de factura | Facturación | `templates/invoice.html` | Ninguna | Plantilla |
| 3.7 | Comparativos de período | Estados Financieros | `components/financials/` | 1.15 | Comparativos |
| 3.8 | Servicio de cálculo de ratios financieros | Estados Financieros | `lib/services/financial-ratios.ts` | 1.15 | 15+ ratios |
| 3.9 | Dashboard de ratios financieros | Estados Financieros | `app/reports/ratios/page.tsx` | 3.8 | Dashboard |
| 3.10 | Corregir clasificación de Flujo de Efectivo | Estados Financieros | `CashFlowStatement.tsx` | 1.15 | Clasificación precisa |
| 3.11 | Reportes consolidados de asistencia | RRHH | `app/.../hr/attendance/reports/page.tsx` | 2.4 | Reporte |
| 3.12 | Generar asiento contable automático por factura | Facturación | `lib/services/invoice-accounting.ts` | Etapa 1 | Asiento |
| 3.13 | Aging de cuentas por cobrar | Facturación | `app/reports/aging/page.tsx` | Etapa 1 | Reporte |
| 3.14 | Integración planilla con asistencia y permisos | RRHH | `lib/services/payroll-service.ts` | 2.1-2.3, 2.17 | Integración |

**Entregable Etapa 3:** Exportación Excel/PDF completa, ratios financieros, comparativos, aging.

### 17.5 Etapa 4: Funcionalidad Avanzada (Semanas 12-24)

**Objetivo:** Presupuestos, multi-almacén, workflow de compras, cotizaciones, correo real.

| # | Tarea | Módulo | Archivos | Dependencias | Entregable |
|---|---|---|---|---|---|
| 4.1 | Modelo de datos de presupuestos | Control Financiero | `supabase/BUDGET_TABLES.sql` | Ninguna | Tablas SQL |
| 4.2 | CRUD de presupuestos | Control Financiero | `lib/services/budget-service.ts` + API | 4.1 | Servicio + API |
| 4.3 | UI de gestión de presupuestos | Control Financiero | `app/financial/budgets/page.tsx` | 4.2 | Página |
| 4.4 | Reporte presupuesto vs real | Control Financiero | `app/reports/budget-vs-actual/page.tsx` | 4.2 | Reporte |
| 4.5 | Modelo de centros de costo | Control Financiero | `supabase/COST_CENTERS.sql` | Ninguna | Tablas SQL |
| 4.6 | Asignación de transacciones a centros | Control Financiero | `lib/services/cost-center-service.ts` | 4.5 | Servicio |
| 4.7 | UI de centros de costo | Control Financiero | `app/financial/cost-centers/page.tsx` | 4.6 | Página |
| 4.8 | UI de gestión de almacenes | Inventario | `app/inventory/warehouses/page.tsx` | Ninguna | Página |
| 4.9 | Transferencias entre almacenes | Inventario | `components/inventory/TransferForm.tsx` | 4.8 | Formulario |
| 4.10 | Stock por almacén | Inventario | `lib/services/warehouse-stock.ts` | 4.8 | Consulta |
| 4.11 | Formulario de órdenes de compra | Compras | `components/purchasing/PurchaseOrderForm.tsx` | 1.7-1.9 | Formulario |
| 4.12 | Workflow de aprobación de compras | Compras | `lib/services/po-approval.ts` | 4.11 | Aprobación |
| 4.13 | Recepción de mercancía | Compras | `components/purchasing/ReceivingForm.tsx` | 4.12 | Recepción |
| 4.14 | Cotizaciones/Proformas | Facturación | `components/sales/QuoteForm.tsx` | Etapa 1 | Formulario |
| 4.15 | Órdenes de venta | Facturación | `components/sales/SalesOrderForm.tsx` | Etapa 1 | Formulario |
| 4.16 | Conversión cotización → factura | Facturación | `lib/services/quote-conversion.ts` | 4.14 | Conversión |
| 4.17 | Configurar Resend o SendGrid | Otras | `lib/mail.ts` | Ninguna | Proveedor activo |
| 4.18 | Correo de envío de facturas | Otras | `lib/services/invoice-email.ts` | 4.17 | Envío |
| 4.19 | Recordatorios de pago | Otras | `lib/services/payment-reminders.ts` | 4.17 | Automatización |
| 4.20 | Valoración FIFO de inventario | Inventario | `lib/services/inventory-valuation.ts` | Etapa 1 | Cálculo FIFO |
| 4.21 | Valoración promedio ponderado | Inventario | `lib/services/inventory-valuation.ts` | Etapa 1 | Cálculo promedio |
| 4.22 | Devoluciones a proveedores | Compras | `components/purchases/PurchaseReturnForm.tsx` | 1.7-1.9 | Formulario |
| 4.23 | Matching 3 vías | Compras | `lib/services/three-way-matching.ts` | 4.11-4.13 | Control |

**Entregable Etapa 4:** Presupuestos, multi-almacén, workflow de compras, cotizaciones, correo real.

### 17.6 Etapa 5: Automatización y Funcionalidades Adicionales (Semanas 18-28)

**Objetivo:** Notificaciones in-app, reportes programados, conciliación bancaria, cierre mensual.

| # | Tarea | Módulo | Archivos | Dependencias | Entregable |
|---|---|---|---|---|---|
| 5.1 | Centro de notificaciones | Otras | `components/notifications/NotificationCenter.tsx` | Ninguna | UI |
| 5.2 | Tabla de notificaciones | Otras | `supabase/NOTIFICATIONS.sql` | Ninguna | Tabla |
| 5.3 | Preferencias de notificación | Otras | `lib/services/notification-preferences.ts` | 5.2 | Configuración |
| 5.4 | Sistema de reportes programados | Reportes | `lib/services/scheduled-reports.ts` | Ninguna | Configuración |
| 5.5 | Generación automática de reportes por correo | Reportes | `lib/services/email-reports.ts` | 5.4, 4.17 | Automatización |
| 5.6 | UI de programación de reportes | Reportes | `app/reports/scheduled/page.tsx` | 5.4 | Config UI |
| 5.7 | Conciliación bancaria inteligente | Control Financiero | `lib/services/reconciliation.ts` | 1.15 | Matching mejorado |
| 5.8 | Cierre mensual automatizado | Contabilidad | `lib/services/monthly-closing.ts` | Etapa 1 | Cierre automático |
| 5.9 | Balance de apertura automático | Contabilidad | `lib/services/opening-balance.ts` | 5.8 | Balance |
| 5.10 | Servicio de KPIs centralizado | Reportes | `lib/services/kpi-service.ts` | Ninguna | Cálculo |
| 5.11 | Tabla de histórico de KPIs | Reportes | `supabase/KPI_HISTORY.sql` | Ninguna | Almacenamiento |
| 5.12 | Dashboard de KPIs con tendencias | Reportes | `app/reports/kpis/page.tsx` | 5.10-5.11 | Dashboard |
| 5.13 | Caja chica | Control Financiero | `components/financial/PettyCash.tsx` | Ninguna | UI |
| 5.14 | Conteo de inventario físico | Inventario | `components/inventory/PhysicalCount.tsx` | Ninguna | Formulario |
| 5.15 | Tracking por lote/serie | Inventario | `lib/services/batch-tracking.ts` | Ninguna | Trazabilidad |
| 5.16 | Cálculo automático aguinaldo/bono vacacional | RRHH | `lib/services/payroll-service.ts` | 2.1-2.3 | Cálculos |
| 5.17 | Generación de PDF de nómina | RRHH | `lib/services/payslip-generator.ts` | 5.16 | PDF nómina |
| 5.18 | Dashboard de cumplimiento fiscal | Fiscal | `app/fiscal-compliance/page.tsx` | Etapa 2 | Dashboard |

**Entregable Etapa 5:** Notificaciones, reportes programados, KPIs, cierre mensual, caja chica.

### 17.7 Etapa 6: Seguridad y Calidad (Semanas 24-36)

**Objetivo:** Refuerzo de seguridad, pruebas, documentación, backup/restore.

| # | Tarea | Módulo | Archivos | Dependencias | Entregable |
|---|---|---|---|---|---|
| 6.1 | Auditar RLS en todas las tablas | Seguridad | `supabase/AUDIT_RLS.sql` | Ninguna | Informe |
| 6.2 | Habilitar RLS en tablas sin protección | Seguridad | Migraciones SQL | 6.1 | RLS activo |
| 6.3 | Middleware server-side de validación tenant | Seguridad | `lib/middleware/tenant-validation.ts` | Ninguna | Validación |
| 6.4 | Migrar rate limiting a Redis/Supabase | Seguridad | `lib/login-security.ts` | Ninguna | Persistencia |
| 6.5 | Implementar 2FA | Seguridad | `lib/services/two-factor.ts` + UI | Ninguna | 2FA funcional |
| 6.6 | Exportación de logs de auditoría | Seguridad | `lib/services/audit-export.ts` | Ninguna | CSV/Excel |
| 6.7 | Pruebas unitarias para servicios críticos | QA | `__tests__/services/` | Todas | Suite pruebas |
| 6.8 | Pruebas E2E para flujos principales | QA | `__tests__/e2e/` | Todas | Pruebas E2E |
| 6.9 | Pruebas de cálculos fiscales | QA | `__tests__/fiscal/` | Todas | Pruebas |
| 6.10 | Pruebas de RLS | QA | `__tests__/rls/` | Todas | Pruebas |
| 6.11 | Sistema de backup automático | Otras | `lib/services/backup-service.ts` | Ninguna | Backup |
| 6.12 | Restore de datos | Otras | `lib/services/restore-service.ts` | 6.11 | Restore |
| 6.13 | Documentación de API contable | Docs | `docs/ACCOUNTING_API.md` | Todas | Documentación |
| 6.14 | Documentación de API de facturación | Docs | `docs/BILLING_API.md` | Todas | Documentación |
| 6.15 | Guía de usuario | Docs | `docs/USER_GUIDE.md` | Todas | Guía |
| 6.16 | Validación de integridad del catálogo | Contabilidad | `lib/services/account-validation.ts` | Etapa 1 | Validaciones |
| 6.17 | Alertas de seguridad para acciones críticas | Seguridad | `lib/services/security-alerts.ts` | 6.6 | Notificaciones |
| 6.18 | Dashboard de seguridad | Seguridad | `app/security/dashboard/page.tsx` | 6.6 | Dashboard |

**Entregable Etapa 6:** Seguridad reforzada, pruebas automatizadas, documentación completa, backup.

### 17.8 Resumen de Esfuerzo por Etapa

| Etapa | Tareas | Complejidad | Estimación | Semanas |
|---|---|---|---|---|
| **Etapa 1:** Consolidación de Datos | 17 tareas | Alta | 4-6 semanas | 1-6 |
| **Etapa 2:** Funcionalidad Core | 20 tareas | Alta | 6-8 semanas | 4-12 |
| **Etapa 3:** Exportación y Reporting | 14 tareas | Media | 4-6 semanas | 8-16 |
| **Etapa 4:** Funcionalidad Avanzada | 23 tareas | Alta | 8-10 semanas | 12-24 |
| **Etapa 5:** Automatización | 18 tareas | Media | 6-8 semanas | 18-28 |
| **Etapa 6:** Seguridad y Calidad | 18 tareas | Media | 6-8 semanas | 24-36 |
| **TOTAL** | **110 tareas** | — | **34-46 semanas** | **36 semanas** |

### 17.9 Ruta Crítica

```
SEMANA  1─────────6─────────12─────────18─────────24─────────36
        │         │         │         │         │         │
ETAPA 1 ████████████         │         │         │         │
  Migrar datos a BD          │         │         │         │
  Consolidar schemas         │         │         │         │
  Conectar componentes       │         │         │         │
        │         │         │         │         │         │
ETAPA 2     ████████████████████      │         │         │
  DIAT                          │         │         │         │
  Notas crédito/débito          │         │         │         │
  Asientos automáticos          │         │         │         │
  PIP RRHH                      │         │         │         │
        │         │         │         │         │         │
ETAPA 3             ████████████████████      │         │
  Excel export                      │         │         │
  PDF profesional                   │         │         │
  Ratios financieros                │         │         │
        │         │         │         │         │         │
ETAPA 4                 ████████████████████████████      │
  Presupuestos                          │         │         │
  Multi-almacén                         │         │         │
  Workflow compras                      │         │         │
  Cotizaciones                          │         │         │
        │         │         │         │         │         │
ETAPA 5                         ████████████████████████
  Notificaciones                        │         │
  Reportes programados                  │         │
  KPIs                                  │         │
        │         │         │         │         │         │
ETAPA 6                                 ████████████████████
  Seguridad reforzada                           │         │
  Pruebas                                        │         │
  Documentación                                  │         │
```

### 17.10 Estimación de Costo Total

| Concepto | Estimación |
|---|---|
| Total tareas | 110 |
| Complejidad promedio | Alta |
| Duración secuencial | 34-46 semanas |
| Duración con paralelismo (2-3 devs) | 16-24 semanas |
| Fases simultáneas posibles | Etapas 1+2+3 en paralelo; 4+5 después; 6 al final |

### 17.11 Priorización por Impacto

**PRIORIDAD 1 — Estabilidad de Datos (Semanas 1-6):**
- Migrar Compras de JSON a Supabase
- Migrar HR de localStorage a Supabase
- Consolidar dual schemas (Facturación, Inventario)
- Conectar JournalEntryForm y FinancialStatements a API real

**PRIORIDAD 2 — Cumplimiento Fiscal (Semanas 4-12):**
- Implementar DIAT
- Crear notas de crédito/débito
- Integrar retenciones con asientos contables

**PRIORIDAD 3 — Funcionalidad Core (Semanas 8-20):**
- Presupuestos y centros de costo
- Multi-almacén para inventario
- Workflow de órdenes de compra
- Exportación Excel para reportes

**PRIORIDAD 4 — Automatización (Semanas 16-28):**
- Correo electrónico real
- Notificaciones in-app
- Reportes programados
- 2FA y seguridad avanzada

**PRIORIDAD 5 — Calidad (Semanas 24-36):**
- Pruebas unitarias y E2E
- Documentación de API
- Backup/restore automatizado

---

> **Archivos de documentación disponibles en `docs/`:**
> - `PROJECT_DOCUMENTATION.md` — Este documento
> - `MASTER_REPORT.md` — Reporte maestro de progreso
> - `HR_MODULE_REPORT.md` — Reporte de Recursos Humanos
> - `REGISTROS_CONTABLES_REPORT.md` — Reporte de Registros Contables (incluido en Contabilidad unificada)
> - `ESTADOS_FINANCIEROS_REPORT.md` — Reporte de Estados Financieros (incluido en Contabilidad unificada)
> - `LIBROS_LEGALES_REPORT.md` — Reporte de Libros Legales (incluido en Contabilidad unificada)
> - `FACTURACION_VENTAS_REPORT.md` — Reporte de Facturación
> - `INVENTARIO_REPORT.md` — Reporte de Inventario
> - `COMPRAS_PROVEEDORES_REPORT.md` — Reporte de Compras
> - `CONTROL_FINANCIERO_REPORT.md` — Reporte de Control Financiero
> - `REPORTES_ANALISIS_REPORT.md` — Reporte de Reportes y Análisis
> - `SEGURIDAD_CONTROL_REPORT.md` — Reporte de Seguridad
> - `OTRAS_CARACTERISTICAS_REPORT.md` — Reporte de Otras Características
> - `INTEGRACION_FISCAL_REPORT.md` — Reporte de Integración Fiscal
