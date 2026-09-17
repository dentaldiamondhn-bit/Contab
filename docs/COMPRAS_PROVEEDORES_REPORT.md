# Reporte de Estado y Plan de Ejecución: Compras y Proveedores

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Gestión de Proveedores** | Completo | 1 componente | 1 ruta | 1 tabla (`Supplier`) | Supabase |
| **Órdenes de Compra** | Básico | 1 componente (listado) | 1 ruta | 2 tablas | Supabase |
| **Registro de Compras** | Completo | 1 página | 4 rutas | 2 tablas | Supabase |
| **Pagos a Proveedores** | Completo | 1 componente | 1 ruta | 1 tabla | Supabase |
| **Cuentas por Pagar** | Parcial | En SupplierManager | — | 1 tabla | Supabase |
| **Devoluciones** | No Iniciado | 0 | 0 | 0 | — |
| **Listas de Precios** | No Iniciado | 0 | 0 | 0 | — |
| **Dashboard de Compras** | Completo | 1 página | 1 ruta | — | Supabase |
| **Libro de Compras Legal** | Completo | 1 página | 1 ruta | 1 vista | Supabase |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~60% | Núcleo de proveedores, compras y pagos completo en Supabase |
| Cobertura de Pruebas | E2E | Flujo compra (contado/crédito) + pagos verificado por E2E sobre HTTP |
| Persistencia | ~100% | Compras, pagos y proveedores persistidos en Supabase (ya no JSON) |
| Integración Contable | ~30% | Asiento contable best-effort al registrar compra (no bloquea) |
| Workflow de Compra | ~15% | Sin aprobación, recepción parcial, matching 3 vías |

### 1.3 Migración JSON → Supabase (16 Sept 2026)

- Proveedores, compras y pagos ahora se leen/escriben en Supabase (`Supplier`, `Purchase`, `PurchaseItem`, `SupplierPayment`).
- Migraciones aplicadas: `company_id` como texto, RTN ampliado a 20 caracteres, 4 claves foráneas entre las tablas.
- Datos migrados e importados (1 proveedor, 2 compras, 3 ítems, 2 pagos).
- Estados de compra normalizados en mayúsculas: `PENDING`, `PARTIAL`, `PAID`, `CANCELLED`.
- Recompute de saldos/estado en cada operación de pago; `issue` de `PARTIAL` cuando queda saldo (incluso en compras convertidas a contado).
- Legacy: `app/api/supplier-payments/route.ts` y los archivos JSON (`purchases-data.json`, `suppliers-data.json`, `purchase-payments.json`) ya no se usan en el código (candidatos a eliminar).

---

## 2. Inventario Detallado

### 2.1 Gestión de Proveedores

**Estado: Completo**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/purchasing/SupplierManager.tsx` | CRUD de proveedores + Cuentas por Pagar: seguimiento de pagables, procesamiento de pagos, exportación CSV |
| `app/api/suppliers/route.ts` | API CRUD sobre Supabase (`GET`/`POST`/`PATCH`/`DELETE`), filtros por `companyId` y `search`, insert de columnas comerciales |
| `app/companies/[id]/suppliers/page.tsx` | Página de proveedores por empresa |

#### Tabla de Base de Datos

- `Supplier` (Supabase) — `rtn`, `name`, `commercial_name`, `email`, `phone`, `mobile`, `address`, `city`, `country`, `supplier_type`, `category`, `payment_terms`, `payment_method`, `bank_name`, `bank_account`, `account_type`, `is_active`, `is_preferred`, `tenant_id`, `company_id`, `created_at`, `updated_at`

#### Lo que Falta

- Sin historial de precios por proveedor
- Sin calificación de proveedores
- Sin condiciones de pago configurables

---

### 2.2 Órdenes de Compra

**Estado: Básico (~25%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/purchasing/PurchaseOrdersManager.tsx` | Listado básico de órdenes + botón "Nueva Orden" (sin formulario de creación) |
| `app/api/purchase-orders/route.ts` | API CRUD usando tablas `PurchaseOrder` + `PurchaseOrderItem` en Supabase |

#### Tablas

- `PurchaseOrder` — id, orderNumber, status, totalAmount, tenant_id, supplier_id, order_date, expected_date, subtotal, tax_amount, total, notes
- `PurchaseOrderItem` — purchaseOrderId, product_id, product_name, quantity, unit_price, total

#### Lo que Falta

- **Sin formulario de creación de órdenes** (solo listado)
- Sin workflow de aprobación
- Sin recepción de mercancía
- Sin matching 3 vías (OC → Recepción → Factura)

---

### 2.3 Registro de Compras

**Estado: Completo (~85%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/purchases/page.tsx` | Página completa: CRUD de compras con ítems, proveedores, CAI, cálculo de impuestos, integración con PaymentManager |
| `lib/purchase-db.ts` | Lógica compartida: `transformPurchase`, `fetchPurchases`, `createPurchase`, `updatePurchase`, `recomputePurchase`, `deletePurchase`, asiento contable best-effort, upsert de producto |
| `app/api/purchases/route.ts` | API `GET`/`POST` sobre Supabase (tabla `Purchase` + ítems) |
| `app/api/purchases/[id]/route.ts` | API individual (`GET`/`PUT`/`DELETE`) |
| `app/api/purchases/reports/route.ts` | Reportes: resumen, mensual, por categoría, por proveedor |
| `app/api/purchases/export/route.ts` | Exportación de datos |
| `app/api/purchase-book/route.ts` | Libro de compras legal |

#### Tablas

- `Purchase` — `id`, `supplier_id`, `invoice_number`, `cai`, `invoice_date`, `subtotal`, `tax_rate`, `tax_amount`, `total`, `purchase_type`, `expense_category`, `document_url`, `is_credit`, `due_date`, `status`, `amount_paid`, `balance_due`, `journal_entry_id`, `tenant_id`, `company_id`, `created_at`, `updated_at`
- `PurchaseItem` — `purchase_id`, `product_id`, `product_code`, `product_name`, `description`, `quantity`, `unit_price`, `discount_percentage`, `discount_amount`, `subtotal`, `tax_rate`, `tax_amount`, `total`, `tenant_id`, `created_at`

#### Regla de Estado (recompute)

`paid` = suma de `SupplierPayment.amount` (si hay pagos) o conserva `amount_paid` (contado sin pagos registrados); `balance` = `total - paid`; estado: `balance <= 0 → PAID`, `paid > 0 → PARTIAL`, crédito sin pagos → `PENDING`, contado sin pagos → `PARTIAL`.

#### Efectos Laterales

- Upsert best-effort del producto en la tabla `product` (stock y costo).
- Asiento contable best-effort (no bloquea la operación, guarda `journal_entry_id`).

#### Lo que Falta

- Sin integración contable obligatoria (asiento opcional)
- Sin matching con órdenes de compra
- Sin workflow de aprobación

---

### 2.4 Pagos a Proveedores

**Estado: Completo (~85%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/purchases/PaymentManager.tsx` | CRUD de pagos: métodos de pago (efectivo, transferencia, cheque, tarjeta), seguimiento de saldo |
| `app/api/purchases/payments/route.ts` | API `GET`/`POST`/`PUT`/`DELETE` sobre Supabase (tabla `SupplierPayment`) con recálculo automático de saldo/estado |

#### Tablas

- `SupplierPayment` — `id`, `supplier_id`, `purchase_id`, `company_id`, `amount`, `payment_date`, `payment_method`, `reference_number`, `notes`, `is_reconciled`, `tenant_id`, `created_at`, `updated_at`

#### Nota sobre Legacy

- `app/api/supplier-payments/route.ts` sigue en el repo pero escribe en `supplier-payments.json`/`purchases-data.json` (mecanismo anterior). El código actual usa `app/api/purchases/payments/route.ts`; los archivos JSON ya no se referencian.

#### Lo que Falta

- Sin generación de asiento contable por pago
- Sin conciliación bancaria de pagos

---

### 2.5 Dashboard de Compras

**Estado: Completo (~75%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/purchases/PurchasesDashboard.tsx` | Dashboard analítico: tendencias mensuales, desglose por categoría, ranking de proveedores (Recharts) |
| `app/companies/[id]/purchases/dashboard/page.tsx` | Página de dashboard |
| `app/api/dashboard/purchase-stats/route.ts` | API de estadísticas |

---

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | Sin formulario de creación de órdenes de compra | Funcionalidad incompleta | Crítica |
| 2 | Sin integración contable completa (asiento best-effort) | Doble registro manual | Alta |
| 3 | Sin devoluciones a proveedores | Sin control de calidad | Alta |
| 4 | Código legacy JSON (route `supplier-payments` + 3 archivos) en repo | Código muerto, riesgo de confusión | Media |
| 5 | Sin matching 3 vías | Sin control de compras | Media |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Migración a Base de Datos — ✅ Completada (16 Sept 2026)

| # | Tarea | Archivos | Entregable | Estado |
|---|---|---|---|---|
| 1.1 | Migrar proveedores de JSON a Supabase | `app/api/suppliers/route.ts` | API con Supabase | ✅ |
| 1.2 | Migrar compras de JSON a Supabase | `app/api/purchases/route.ts`, `lib/purchase-db.ts` | API con Supabase | ✅ |
| 1.3 | Migrar pagos de JSON a Supabase | `app/api/purchases/payments/route.ts` | API con Supabase | ✅ |
| 1.4 | Script de migración de datos JSON existentes | `migrate-purchases-db.mjs` | Migración | ✅ |

### Etapa 2: Workflow de Compras

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 2.1 | Formulario de creación de órdenes de compra | `components/purchasing/PurchaseOrderForm.tsx` | Formulario |
| 2.2 | Workflow de aprobación | `lib/services/po-approval.ts` | Aprobación |
| 2.3 | Recepción de mercancía | `components/purchasing/ReceivingForm.tsx` | Recepción |

### Etapa 3: Integración Contable

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 3.1 | Generar asiento contable por compra (obligatorio) | `lib/services/purchase-accounting.ts` | Asiento automático |
| 3.2 | Generar asiento contable por pago | `lib/services/payment-accounting.ts` | Asiento automático |
| 3.3 | Integración con libro de compras legal | `lib/services/legal-books.ts` | Auto-generación |

### Etapa 4: Devoluciones y Reportes

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 4.1 | Devoluciones a proveedores | `components/purchases/PurchaseReturnForm.tsx` | Formulario |
| 4.2 | Matching 3 vías | `lib/services/three-way-matching.ts` | Control |
| 4.3 | Reportes avanzados de compras | `app/reports/purchases/page.tsx` | Reportes |

### Etapa 5: QA

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 5.1 | Pruebas automatizadas de compras y pagos | `__tests__/purchasing/` | Pruebas unitarias |
| 5.2 | Eliminar legacy JSON (route + archivos) | `app/api/supplier-payments/`, `*.json` | Limpieza |

---

## 5. Estimación de Esfuerzo

| Etapa | Tareas | Complejidad | Estimación |
|---|---|---|---|
| ~~Etapa 1: Migración BD~~ | ~~4 tareas~~ | ~~Alta~~ | ✅ Completada |
| Etapa 2: Workflow | 3 tareas | Alta | 3-4 semanas |
| Etapa 3: Contabilidad | 3 tareas | Media | 2-3 semanas |
| Etapa 4: Devoluciones | 3 tareas | Media | 2-3 semanas |
| Etapa 5: QA | 2 tareas | Media | 1 semana |
| **Total** | **11 tareas** | — | **8-11 semanas** |

---

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 16.3.5 | Restaurado desde 15.5.25; build y dev OK en Vercel (16 Sept 2026) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |

## Actualizaciones de Compras (16 Sept 2026)

| Cambio | Detalle |
|---|---|
| Proveedores en Supabase | `app/api/suppliers/route.ts` (GET/POST/PATCH/DELETE) sobre tabla `Supplier` |
| Compras en Supabase | `app/api/purchases/*` sobre `Purchase` + `PurchaseItem`, vía `lib/purchase-db.ts` |
| Pagos en Supabase | `app/api/purchases/payments` sobre `SupplierPayment` con recompute de saldo/estado |
| Estados normalizados | `PENDING` / `PARTIAL` / `PAID` / `CANCELLED` (mayúsculas en GET) |
| Recompute PARTIAL | Saldo pendiente tras borrar/editar pago → `PARTIAL` (incl. compras convertidas a contado) |
| Migraciones SQL | `company_id` texto, RTN 20, 4 FKs — aplicadas en Supabase |
| Datos migrados | 1 proveedor, 2 compras, 3 ítems, 2 pagos |
| E2E | 37+ casos PASS sobre HTTP (dev server, Supabase real) |
| Middleware Clerk | `/api/suppliers`, `/api/purchases/*` y `/api/purchases/payments` son rutas **protegidas**: `auth.protect()` → HTTP 404 sin sesión; se propaga `x-tenant-id` |
| DDL vía SQL Editor | Sin acceso DDL directo (`DATABASE_URL` → ENOTFOUND); tablas nuevas y migraciones se aplican en el SQL Editor de Supabase |
| DIAT | El reporte DIAT (`lib/services/diat-generator.ts`, ver `docs/DIAT_REPORT.md`) consume `Purchase` + proveedor para las compras del período |