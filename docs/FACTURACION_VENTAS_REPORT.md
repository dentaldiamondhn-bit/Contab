# Reporte de Estado y Plan de Ejecución: Facturación y Ventas

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Facturación** | Parcial | 1 componente | 3 rutas | `Invoice` + `InvoiceItem` | Supabase + Prisma |
| **Gestión de Clientes** | Completo | 1 componente | 1 ruta | 1 tabla | Supabase |
| **Cuentas por Cobrar** | Parcial | 1 componente | — | 1 tabla | Supabase |
| **Gestión CAI** | Completo | 1 dashboard | 6 rutas | 2 tablas | Supabase + Prisma |
| **Notas de Crédito/Débito** | **Implementado** | 1 página + 2 componentes | 2 rutas | 1 tabla (`InvoiceNote`) | Supabase |
| **Cotizaciones/Proformas** | No Iniciado | 0 | 0 | 0 | — |
| **Órdenes de Venta** | No Iniciado | 0 | 0 | 0 | — |
| **Dashboard de Ventas** | Completo | 1 dashboard | 1 ruta | — | Supabase |
| **Libro de Ventas Legal** | Completo | 1 página | 1 ruta | 1 vista | Supabase |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~70% | Facturación y clientes base + notas de crédito/débito (fiscal SAR); sin cotizaciones ni órdenes |
| Cobertura de Pruebas | 0% | No existen pruebas |
| Persistencia | ~80% | Esquema único `Invoice`/`InvoiceItem`; consolidado el 16 Sept 2026 (migración 007) |
| Cumplimiento Fiscal | ~70% | CAI, campos fiscales en factura y notas NC-/ND- con numeración consecutiva por tenant |
| Integración | ~45% | La factura no genera asiento; las notas de crédito/débito sí (voucherType AJUSTE, best-effort) |

---

## 2. Inventario Detallado

### 2.1 Facturación

**Estado: Parcial (~70%)** — Esquema único consolidado (migración 007, 16 Sept 2026)

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/sales/InvoiceForm.tsx` | Formulario de creación: selección de cliente, líneas de detalle, cálculo de impuestos, productos de inventario, numeración automática |
| `app/api/billing/invoices/route.ts` | API POST: crea facturas (tabla canónica `Invoice`) |
| `app/api/billing/invoices/generate-current/route.ts` | Generación de facturación actual/recurrente |
| `app/api/admin/billing/invoices/route.ts` | API del módulo Facturación (tabla canónica `Invoice`) |
| `app/api/billing/fiscal-info/route.ts` | Información fiscal de la empresa |
| `app/api/billing/bank-accounts/route.ts` | Cuentas bancarias del módulo Facturación |
| `app/api/billing/products/route.ts` | Productos del módulo Facturación |
| `app/api/billing/customers/route.ts` | Clientes del módulo Facturación |
| `lib/billing/invoice-generator.ts` | Generador server-side de facturas de suscripción (automático mensual para tenants) |

#### Tablas de Base de Datos

- `Invoice` (canónico, PascalCase) — id, tenantId, invoiceNumber, invoiceType, status, customerName/RTN/Email/Address, issuerName/RTN/Address, issueDate, dueDate, cai, rangeStart, rangeEnd, expiryDate, subtotal, tax, total, currency, taxRate, invoiceImage, invoicePdf, notes, createdBy, updatedBy
- `InvoiceItem` (canónico, PascalCase) — id, invoiceId, description, quantity, unitPrice, total, taxRate, taxAmount, isTaxable, productCode, serviceCode
- `InvoiceNote` (Supabase) — Notas de crédito/débito (ver sección 2.6)

> Las tablas legacy `invoice`, `invoiceitem`, `invoices`, `invoice_items` fueron eliminadas en la migración 007 (16 Sept 2026); los modelos Prisma `Invoice`/`InvoiceItem` se realinearon con estas columnas.

#### Lo que Falta

- ~~Dual schema inconsistente~~ ✅ Resuelto: esquema único `Invoice`/`InvoiceItem` (migración 007, 16 Sept 2026)
- ~~Sin generación de PDF de factura~~ ✅ Resuelto: `InvoicePDF` server-side + botón real (17 Sept 2026)
- Sin envío por correo
- Sin facturación recurrente para clientes finales

---

### 2.2 Gestión de Clientes

**Estado: Completo (~80%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/sales/CustomerManager.tsx` | CRUD completo: RTN, nombre, email, teléfono, dirección, límite de crédito |
| `app/api/billing/customers/route.ts` | API GET/POST clientes (tabla `customer`) |
| `app/contacts/page.tsx` | Página de contactos (clientes + proveedores, 2271 líneas) |

#### Tabla

- `customer` (Supabase) — id, rtn, name, email, phone, address, credit_limit, current_debt, is_active, tenant_id

---

### 2.3 Cuentas por Cobrar

**Estado: Parcial (~50%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/sales/AccountsReceivableManager.tsx` | Seguimiento de cuentas por cobrar, procesamiento de pagos, exportación CSV, cálculos de vencimiento |
| `components/sales/SalesDashboard.tsx` | Dashboard KPIs: facturas totales, ingresos, cobrar, vencidos, crecimiento mensual, top clientes |

#### Tabla

- `AccountReceivable` — tenantId, customerId, invoiceId, amount, paidAmount, balanceAmount, dueDate, status

#### Lo que Falta

- Sin aging de cuentas por cobrar (30/60/90 días)
- Sin recordatorios automáticos de pago
- Sin integración con plan de cuentas

---

### 2.4 Gestión CAI

**Estado: Completo (~85%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/dashboard/CAIDashboard.tsx` | Dashboard: alertas, estadísticas, estado de CAIs |
| `lib/services/cai-service.ts` | Servicio CRUD completo: estados (ACTIVE/EXPIRING/EXPIRED/EXHAUSTED), alertas (rango 10 unidades, vencimiento 30/7 días), numeración, estadísticas |
| `app/api/billing/cai/route.ts` | API CAI (GET) |
| `app/api/billing/cai/[id]/route.ts` | API individual (GET/PUT) |
| `app/api/billing/cai/tenant/[tenantId]/route.ts` | CAI por tenant |
| `app/api/billing/cai/list/route.ts` | Lista de CAIs |
| `app/cai/page.tsx` | Página de gestión CAI |
| `scripts/migrations/CREATE_CAI_TABLE.sql` | Migración SQL |

#### Tablas

- `cai` (Prisma + Supabase) — id, cai, start_number, end_number, current_number, issue_date, expiration_date, status, tenant_id
- `talonarios` — Gestión de talonarios de facturación

---

### 2.5 Dashboard de Ventas

**Estado: Completo (~75%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/sales/SalesDashboard.tsx` | KPIs: total facturas, ingresos, por cobrar, vencidos, crecimiento, top clientes |
| `components/dashboard/InvoiceStats.tsx` | Widget de estadísticas |
| `app/api/dashboard/invoice-stats/route.ts` | API de estadísticas |

---

### 2.6 Notas de Crédito/Débito — ✅ IMPLEMENTADO (16 Sept 2026)

**Estado: Implementado (~85%)** — Resuelve el ítem crítico fiscal "Sin notas de crédito/débito" (SAR Honduras).

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/services/notes-service.ts` | Servicio central (396 líneas): numeración consecutiva NC-/ND- por tenant, CRUD, resolución de tenant, asiento contable best-effort |
| `app/api/billing/notes/route.ts` | API listado (`GET` sin auth, filtros) + creación (`POST` con auth, `401` sin sesión) |
| `app/api/billing/notes/[id]/route.ts` | API por nota: `GET` detalle + `PATCH` estado (`APPLIED`/`CANCELLED`); Next 16: `await params` |
| `components/billing/NoteForm.tsx` | `CreditNoteForm` / `DebitNoteForm`: selector de factura original (vía `/api/admin/billing/invoices`), fecha, motivo, monto, método de pago (efectivo/crédito) |
| `components/billing/NotePreview.tsx` | Vista imprimible del documento (datos del tenant y de la factura referenciada, `window.print()`) |
| `app/billing/notes/page.tsx` | Página de gestión: stats, filtros (tipo/estado/búsqueda), crear, aplicar, anular, ver documento |
| `app/billing/page.tsx` | Botón "Notas de Crédito/Débito" → `/billing/notes` |

#### Tabla `InvoiceNote` (Supabase)

`id`, `tenantId`, `originalInvoiceId`, `noteType` (`CREDIT`|`DEBIT`), `noteNumber`, `reason`, `amount`, `status` (`PENDING`|`APPLIED`|`CANCELLED`), `appliedDate`, `createdAt`, `createdBy`.

#### Series de Numeración

- Formato `NC-XXXXXXXX` (crédito) y `ND-XXXXXXXX` (débito), consecutivos **por tenant** (8 dígitos, `nextNoteNumber`).
- Si se referencia una factura inexistente, el vínculo `originalInvoiceId` se omite (evita violación de FK).

#### Asiento Contable (best-effort, no bloquea la emisión)

- Se publica vía `POST /api/accounting/transactions` con header `x-tenant-id`.
- **voucherType:** `AJUSTE`.
- ISV **15% incluido**: `subTotal = monto / 1.15`, `impuesto = monto − subTotal`.
- Cuentas: `4101` Ingresos, `2105` ISV por pagar, contra `1101` Caja (efectivo) / `1103` Clientes (crédito).
- **NC:** +subTotal, +impuesto, −total. **ND:** +total, −subTotal, −impuesto.

#### Flujo de Estados

`PENDING` (creada) → `APPLIED` (aplicada, fija `appliedDate`) | `CANCELLED` (anulada, permanente, con confirmación en UI). Filtros por tipo (`type`), estado (`status`) y rango de fecha (`from`/`to`).

#### Verificación (E2E / build)

- `pnpm build` → `EXIT=0`; rutas: `ƒ /api/billing/notes`, `ƒ /api/billing/notes/[id]`, `○ /billing/notes`.
- Supabase: INSERT `201`, SELECT `200`, DELETE `204`.

---

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | ~~Dual schema de facturas~~ | Resuelto: esquema único `Invoice`/`InvoiceItem` (migración 007, 16 Sept 2026) | — |
| 2 | ~~Sin generación de PDF de factura~~ | Resuelto: `InvoicePDF` server-side + botón real en `app/billing/[id]/page.tsx` (17 Sept 2026) | — |
| 3 | ~~Sin notas de crédito/débito~~ — **IMPLEMENTADO ✅** (ver §2.6) | Incumplimiento fiscal | ~~Crítica~~ Resuelta |
| 4 | Sin cotizaciones/proformas | Sin proceso de ventas | Alta |
| 5 | Factura sin integración contable (las notas NC/ND ya generan asiento AJUSTE) | Doble registro | Alta |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Consolidación de Esquema ✅ + PDF

| # | Tarea | Archivos | Entregable | Estado |
|---|---|---|---|---|
| 1.1 | Consolidar esquemas de factura en uno solo | `scripts/migrations/007_consolidate_invoice_schema.sql`, `prisma/schema.prisma` | Esquema único `Invoice`/`InvoiceItem` | ✅ (16 Sept 2026) |
| 1.2 | Generación de PDF de factura | `components/reports/InvoicePDF.tsx` + motor `lib/services/pdf-documents.ts` + `GET /api/documents/pdf?type=invoice` | PDF funcional | ✅ (17 Sept 2026) |
| 1.3 | Plantilla profesional de factura | Layout compartido `components/reports/ProfessionalDoc.tsx` (A4, encabezado fiscal, CAI, firmas) | Plantilla profesional | ✅ (17 Sept 2026) |

### Etapa 2: Notas de Crédito/Débito — ✅ Completada (16 Sept 2026)

| # | Tarea | Archivos | Entregable | Estado |
|---|---|---|---|---|
| 2.1 | UI de notas de crédito/débito | `components/billing/NoteForm.tsx` (`CreditNoteForm`/`DebitNoteForm`) | Formularios funcionales | ✅ |
| 2.2 | Vista imprimible de nota | `components/billing/NotePreview.tsx` | Documento imprimible | ✅ |
| 2.3 | API de notas | `app/api/billing/notes/route.ts`, `app/api/billing/notes/[id]/route.ts` | API CRUD + cambio de estado | ✅ |
| 2.4 | Servicio + integración con contabilidad | `lib/services/notes-service.ts` | Numeración NC-/ND- por tenant, asiento AJUSTE best-effort | ✅ |
| 2.5 | Página de gestión | `app/billing/notes/page.tsx` + botón en `app/billing/page.tsx` | Stats, filtros, aplicar/anular/ver | ✅ |

### Etapa 3: Cotizaciones y Órdenes

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 3.1 | Cotizaciones/Proformas | `components/sales/QuoteForm.tsx` | Formulario |
| 3.2 | Órdenes de venta | `components/sales/SalesOrderForm.tsx` | Formulario |
| 3.3 | Conversión cotización → factura | `lib/services/quote-conversion.ts` | Conversión |

### Etapa 4: Integración y Automatización

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 4.1 | Generar asiento contable automático por factura | `lib/services/invoice-accounting.ts` | Asiento automático |
| 4.2 | Aging de cuentas por cobrar | `app/reports/aging/page.tsx` | Reporte aging |
| 4.3 | Recordatorios de pago | `lib/services/payment-reminders.ts` | Notificaciones |

### Etapa 5: QA

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 5.1 | Pruebas de facturación | `__tests__/billing/` | Pruebas unitarias |
| 5.2 | Pruebas E2E de flujo de ventas | `__tests__/e2e/sales/` | Pruebas E2E |

---

## 5. Diagrama de Dependencias

```
Etapa 1 (Consolidación + PDF)
    ├── ~~Etapa 2 (Notas de Crédito/Débito)~~ ✅ Completada
    ├── Etapa 3 (Cotizaciones + Órdenes)
    └── Etapa 4 (Integración Contable)
            └── Etapa 5 (QA)
```

---

## 6. Estimación de Esfuerzo

| Etapa | Tareas | Complejidad | Estimación |
|---|---|---|---|
| Etapa 1: Consolidación | 3 tareas | Alta | ✅ 1.1 completada; 1.2-1.3 pendientes (~1-2 semanas) |
| ~~Etapa 2: Notas~~ | ~~4 tareas~~ | ~~Alta~~ | ✅ Completada (16 Sept 2026) |
| Etapa 3: Cotizaciones | 3 tareas | Media | 2-3 semanas |
| Etapa 4: Integración | 3 tareas | Alta | 2-3 semanas |
| Etapa 5: QA | 2 tareas | Media | 1 semana |
| **Total (pendiente)** | **11 tareas** | — | **7-10 semanas** |

---

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 16.3.5 | Restaurado desde 15.5.25; build y dev OK en Vercel (16 Sept 2026) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |

## Actualizaciones de Facturación (16 Sept 2026)

| Cambio | Detalle |
|---|---|
| Notas de crédito/débito | `lib/services/notes-service.ts` + `app/api/billing/notes/*` + `NoteForm`/`NotePreview` + página `app/billing/notes`; numeración `NC-`/`ND-` por tenant, tabla `InvoiceNote`, asiento `AJUSTE` best-effort (cuentas 4101/2105/1101/1103) |
| Rutas verificadas | `ƒ /api/billing/notes` (POST 201), `ƒ /api/billing/notes/[id]` (GET/PATCH), `○ /billing/notes`; `pnpm build` → `EXIT=0` |
| Páginas del módulo Facturación | `app/billing/*`: `[id]`, `subscriptions`, `page`, `notes`, `generate-invoice`, `expenses`, `expenses/new` |
| APIs del módulo Facturación | `app/api/billing/*`: `products`, `payment-receipts`, `payment-links`, `notes`, `notes/[id]`, `invoices`, `invoices/generate-current`, `fiscal-info`, `customers`, `cai` (`route`/`[id]`/`tenant`/`list`/`debug`), `bank-accounts` |
| Fix env `SUPABASE_URL` | `app/api/companies/route.ts` usaba `SUPABASE_URL` (inexistente → 500); ahora usa `NEXT_PUBLIC_SUPABASE_URL`. No existe `SUPABASE_URL` |
| Consolidación esquema | Migración 007: `invoice`/`invoiceitem`/`invoices`/`invoice_items` eliminadas; canónico `Invoice`/`InvoiceItem` (DECIMAL). Prisma realineado |
| Middleware Clerk | Rutas no públicas ejecutan `auth.protect()` → HTTP 404 a no autenticados; inyecta `x-tenant-id`. Públicas: `/auth/*`, `/api/auth/*`, `/api/admin/plans-public`, `/api/paypal/*`, `/api/webhooks/*`, `/api/accounting/uploaded-files`, `/api/accounting/excel-upload` (`trial-balance` salió el 17 Sept 2026) |
