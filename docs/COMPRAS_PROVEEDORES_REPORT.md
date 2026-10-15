# Reporte de Estado y Plan de Ejecución: Compras y Proveedores

> **Última actualización: 8 Octubre 2026.** Este informe acumula secciones fechadas
> (8, 16, 22-23 Sept, 2-8 Oct) que se conservan **tal cual** como histórico. Lo nuevo
> está en **§6 Actualizaciones (2-8 Oct 2026)**; arriba solo se corrigieron las
> afirmaciones que dejaron de ser ciertas, marcadas con su fecha.
>
> Cambios de fondo desde la última revisión (23 Sept):
>
> | Tema | Antes | Ahora |
> |---|---|---|
> | Aislamiento | filtraba por `tenant_id` | **`company_id`** (§6.1) |
> | `Supplier.company_id` | admite `NULL`, sin FK | **NOT NULL + FK** (043) |
> | Unicidad de RTN | `UNIQUE (rtn, tenant_id)` | **ninguna** (044) |
> | Historial de precios | "No Iniciado" | `supplier_price_history` (041) |
> | Calificaciones | "No Iniciado" | `supplier_ratings` + UI (042) |
> | Órdenes de Compra | solo listado, sin FKs | **crear/aprobar/recibir ? `Purchase`** + FKs (052); **recepción parcial + conciliación 3 vías** (059) (§6.6-6.8) |
> | Devoluciones | No iniciado | **por líneas de una compra** con baja de stock + nota de crédito (060) (§6.9) |
> | Pruebas | E2E manual | **104/104** automatizadas |

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Gestión de Proveedores** | Completo | 3 componentes (`SupplierManager`, `SupplierRatings`, `SupplierPriceHistory`) | 5 rutas (`suppliers`, `/import`, `/ratings`, `/price-history`, + `route-original.ts` legacy) | 3 tablas (`Supplier`, `supplier_ratings`, `supplier_price_history`) | Supabase |
| **Órdenes de Compra** | Completo (8 Oct 2026) | 2 páginas (`purchase-orders` con crear/aprobar/recibir parcial; `purchase-orders/conciliation`) | 3 rutas (`purchase-orders`, `receive`, `conciliation`) | 4 tablas (`PurchaseOrder`, `PurchaseOrderItem`, `PurchaseOrderReceipt`, `PurchaseOrderReceiptItem`) | Supabase |
| **Registro de Compras** | Completo | 1 página | 4 rutas | 2 tablas | Supabase |
| **Pagos a Proveedores** | Completo | 1 componente | 1 ruta | 1 tabla | Supabase |
| **Cuentas por Pagar** | Parcial | En SupplierManager | — | 1 tabla | Supabase |
| **Devoluciones** | Completo (8 Oct 2026) | 1 página (`purchases/returns`) | 2 rutas (`purchases/returns`, `purchases/returns/[id]`) | 2 tablas (`PurchaseReturn`, `PurchaseReturnItem`) | Supabase |
| **Listas de Precios** | No Iniciado | 0 | 0 | 0 | — |
| **Histórico de Precios** | Completo (7 Oct 2026) | 1 componente | 1 ruta | 1 tabla (`supplier_price_history`) | Supabase |
| **Calificaciones de Proveedores** | Completo (7 Oct 2026) | 1 componente | 1 ruta | 1 tabla (`supplier_ratings`) | Supabase |
| **Dashboard de Compras** | Completo | 1 página | 1 ruta | — | Supabase |
| **Libro de Compras Legal** | Completo — automático desde transacciones + exportación Excel (22 Sept 2026) | 2 páginas (manual `app/api/reports/libro-compras` + automática `app/companies/[id]/reports/purchase-book`) | 2 rutas (`reports/libro-compras` + trial-balance) | 1 vista | Supabase |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~70% | Núcleo de proveedores, compras, pagos y O.C. (crear/aprobar/recibir) en Supabase |
| Cobertura de Pruebas | **104/104 automatizadas** (8 Oct 2026) | `tests/purchases/` — 39 previos (humo, aislamiento, ratings, price-history) + 34 del módulo O.C. + **15 de recepción parcial y conciliación** + **16 de devoluciones** |
| Persistencia | ~100% | Compras, pagos y proveedores persistidos en Supabase (ya no JSON) |
| Integración Contable | ~30% | Asiento contable best-effort al registrar compra (no bloquea) |
| Workflow de Compra | ~85% | Crear ? aprobar ? **recibir parcial** ? `Purchase` por cada recepción (**8 Oct 2026, 059**); **conciliación 3 vías** (solo lectura) en su propia página |

### 1.3 Migración JSON ? Supabase (16 Sept 2026)

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
| `components/purchasing/SupplierRatings.tsx` | **Nuevo (7 Oct 2026)** — calificaciones de 4 criterios + media |
| `components/purchasing/SupplierPriceHistory.tsx` | **Nuevo (7 Oct 2026)** — histórico de precios por proveedor |
| `app/api/suppliers/route.ts` | API CRUD (`GET`/`POST`/`PATCH`/`DELETE`). **Filtra por `company_id` vía `contextoDeEmpresa()`, no por `?companyId`** (ver §6.1) |
| `app/api/suppliers/import/route.ts` | Importación con dedup de RTN **por empresa** |
| `app/api/suppliers/ratings/route.ts` | **Nuevo** — calificaciones, aislada por `company_id` |
| `app/api/suppliers/price-history/route.ts` | **Nuevo** — histórico de precios, aislado por `company_id` |
| `app/companies/[id]/suppliers/page.tsx` | Página de proveedores por empresa |

> `app/api/suppliers/route-original.ts` es **código muerto**: copia previa de la ruta,
> sin referencia desde el código. Candidato a eliminar (junto al legacy JSON, §3.4).

#### Tabla de Base de Datos

- `Supplier` (Supabase) — `rtn`, `name`, `commercial_name`, `email`, `phone`, `mobile`, `address`, `city`, `country`, `supplier_type`, `category`, `payment_terms`, `payment_method`, `bank_name`, `bank_account`, `account_type`, `is_active`, `is_preferred`, `tenant_id`, `company_id`, `created_at`, `updated_at`

**Restricciones (tras 043, 044 y 045, 7 Oct 2026):**

| Restricción | Estado | Por qué |
|---|---|---|
| `company_id` **NOT NULL** | ? 043 | Un proveedor sin empresa es invisible para todo filtro por empresa |
| **FK** `company_id ? companies(id)` | ? 043 | Antes no existía: se podía colgar de una empresa inexistente |
| Índice `idx_supplier_company` | ? 043 + **único desde la 045** | El índice de la frontera de aislamiento. Existía un duplicado idéntico (`idx_Supplier_ec136b_ci`), medido el 5 Oct: cada escritura de proveedor indexaba la dos veces. La 045 dejó solo este |
| `UNIQUE (rtn, tenant_id)` | ? **eliminado** (044) | Trataba a las empresas de un mismo tenant como una sola |
| FK `company_id` `ON DELETE CASCADE` | ? **cambiado a `NO ACTION`** | Borrar una empresa borraba sus proveedores sin error |

> **Regla que no se negocia:** el mismo proveedor puede atender a varias empresas y
> repetirse en tenants distintos. La única frontera es `company_id`.
> Detalle y evidencia en `AGENTS.md` ? *"Proveedores: NINGUNA unicidad que separe
> empresas"* y en `docs/AISLAMIENTO_EMPRESAS.md`.

#### Lo que Falta

- ~~Sin historial de precios por proveedor~~ ? **resuelto 7 Oct 2026** (`supplier_price_history`, 041)
- ~~Sin calificación de proveedores~~ ? **resuelto 7 Oct 2026** (`supplier_ratings`, 042)
- Sin condiciones de pago configurables
- ~~Índice duplicado `idx_Supplier_ec136b_ci`~~ ? **resuelto 7 Oct 2026** (045): queda
  **uno solo** sobre `company_id`, `idx_supplier_company`. Cada alta/edición/borrado
  de proveedor ya no escribe la columna dos veces.
- Unicidad de `email`: **sin tocar, pendiente de decisión** (una misma empresa sí debería poder dar de baja y reactivar un correo)

---

### 2.2 Órdenes de Compra

**Estado: Completo — crear ? aprobar ? recibir (parcial) ? `Purchase` + conciliación — 8 Oct 2026**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/purchase-orders-db.ts` | Lógica aislada por `company_id` (nunca tenant): `fetchPurchaseOrders`, `createPurchaseOrder`, `updatePurchaseOrder`, `deletePurchaseOrder`, `recibirPurchaseOrder` (parcial), `fetchPurchaseOrderReceipts`, `conciliarOrden`. `hidratarOrdenes` resuelve proveedor/ítems con consultas aparte (sin embeds) |
| `app/api/purchase-orders/route.ts` | GET/POST/PATCH/DELETE con `exigirEmpresa(contextoDeEmpresa)`. Ya no lee `?companyId` del cliente |
| `app/api/purchase-orders/receive/route.ts` | POST `{ id, invoice_number, invoice_date, cai, is_credit, due_date, items? }` ? 201 `{ order, purchase, receipt }` |
| `app/api/purchase-orders/conciliation/route.ts` | **Nuevo** — GET conciliación 3 vías: `?orderId=` (detalle) o lista; `?soloConDiscrepancias=1`, `?tolerancia=`, `?toleranciaPrecio=` |
| `app/companies/[id]/purchase-orders/page.tsx` | Página: listado + modales **Nueva Orden**, Ver, **Aprobar**, **Recibir** con cantidades por artículo; botón a Conciliación |
| `app/companies/[id]/purchase-orders/conciliation/page.tsx` | **Nuevo** — página de conciliación (detalle por orden + lista con diferencias) |

#### Tablas y FKs

- `PurchaseOrder` — `id, order_number, supplier_id, order_date, expected_date, subtotal, tax_amount, total, status, requested_by, approved_by, approved_at, received_by, received_at, notes, purchase_id, tenant_id, company_id, created_at, updated_at, location_id`
- `PurchaseOrderItem` — `purchase_order_id`, `product_id`, `product_name`, `quantity_requested`, `quantity_received`, `unit_price`, `total`
- FK `PurchaseOrder.supplier_id ? "Supplier".id` (NO ACTION) y
  `PurchaseOrderItem.purchase_order_id ? "PurchaseOrder".id` (ON DELETE CASCADE). Antes
  **no existían**: un embed a una relación inexistente da `PGRST200` y **aborta el
  `SELECT` entero** (ver §6.7).
- **Migración 059** (`059_purchase_order_receipts.sql`, escrita y validada —
  **pendiente de aplicar por el usuario**): crea `PurchaseOrderReceipt` (cabecera de
  cada entrega: `purchase_order_id`, `company_id`, `tenant_id`, `invoice_number`,
  `invoice_date`, `cai`, `purchase_id`, `received_at`, `received_by`, `notes`) y
  `PurchaseOrderReceiptItem` (líneas: `receipt_id`, `company_id`, `tenant_id`,
  `purchase_order_item_id`, `product_id`, `product_name`, `quantity_received`,
  `unit_price`, `total`), con índices, RLS y sin CHECK sobre `status`.

#### Flujo O.C. ? Compra (`recibirPurchaseOrder`, recepción parcial)

- Exige `status ? {APPROVED, PARTIALLY_RECEIVED}` ? si no, **409**;
  `invoice_number` obligatorio ? **400**; línea que no casa con ningún artículo ? **400**.
- **Cada llamada = una entrega**: crea su propia `Purchase` (vía `createPurchase`: ítems,
  upsert de producto, historial de precios y asiento), guarda la cabecera y las líneas
  en `PurchaseOrderReceipt`/`PurchaseOrderReceiptItem`, y acumula
  `PurchaseOrderItem.quantity_received`.
- Sin `items` en el cuerpo recibe **lo pendiente** de cada línea (compatibilidad con el
  "recibir todo" de la 052); si ya no queda nada ? **409**.
- Estado: `RECEIVED` cuando cada línea queda completa; si no, `PARTIALLY_RECEIVED`.
  Enlaza `purchase_id` de la orden con la última `Purchase`.
- La validación va **antes** de escribir y **no se reserva el estado**: si algo falla, la
  orden queda intacta y no hace falta revertir. (Esto reemplaza el "marca `RECEIVED`
  antes y revierte" de la 052 — ver §6.8.)

#### Conciliación 3 vías (`conciliarOrden`, solo lectura)

- Compara **ordenado** (O.C.) vs **recibido** (recepciones) vs **facturado** (las
  `Purchase` creadas por las recepciones), agrupando por producto.
- Estado por línea: `OK`, `SIN_RECIBIR`, `PARCIAL`, `EXCESO`, `FALTANTE_FACTURA`,
  `DIF_PRECIO`. `tolerancia` (cantidades) y `toleranciaPrecio` (precios). **No bloquea**;
  es un reporte con alertas.

#### Lo que Falta

- **Formulario de creación de órdenes de compra en `components/purchasing/`** (la UI
  vive en la página `purchase-orders/page.tsx`): refactor de reutilización, no
  funcionalidad nueva.
- Devoluciones a proveedores (Etapa 4.1).

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

`paid` = suma de `SupplierPayment.amount` (si hay pagos) o conserva `amount_paid` (contado sin pagos registrados); `balance` = `total - paid`; estado: `balance <= 0 ? PAID`, `paid > 0 ? PARTIAL`, crédito sin pagos ? `PENDING`, contado sin pagos ? `PARTIAL`.

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
| 1 | ~~Sin formulario de creación de órdenes de compra~~ ? **resuelto 8 Oct 2026** (crear ? aprobar ? recibir, §6.7) | — | ? |
| 2 | Sin integración contable completa (asiento best-effort) | Doble registro manual | Alta |
| 3 | Sin devoluciones a proveedores | Sin control de calidad | Alta |
| 4 | Código legacy JSON (route `supplier-payments` + 3 archivos) en repo | Código muerto, riesgo de confusión | Media |
| 5 | ~~Sin matching 3 vías~~ ? **resuelto 8 Oct 2026** (`conciliarOrden` + página de conciliación, §6.8) | — | ? |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Migración a Base de Datos — ? Completada (16 Sept 2026)

| # | Tarea | Archivos | Entregable | Estado |
|---|---|---|---|---|
| 1.1 | Migrar proveedores de JSON a Supabase | `app/api/suppliers/route.ts` | API con Supabase | ? |
| 1.2 | Migrar compras de JSON a Supabase | `app/api/purchases/route.ts`, `lib/purchase-db.ts` | API con Supabase | ? |
| 1.3 | Migrar pagos de JSON a Supabase | `app/api/purchases/payments/route.ts` | API con Supabase | ? |
| 1.4 | Script de migración de datos JSON existentes | `migrate-purchases-db.mjs` | Migración | ? |

### Etapa 2: Workflow de Compras — ? Completada (básico, 8 Oct 2026)

| # | Tarea | Archivos | Entregable | Estado |
|---|---|---|---|---|
| 2.1 | Formulario de creación de órdenes de compra | `app/companies/[id]/purchase-orders/page.tsx` (modal "Nueva Orden") + `lib/purchase-orders-db.ts` | Formulario | ? |
| 2.2 | Workflow de aprobación | `updatePurchaseOrder` (`DRAFT?PENDING?APPROVED`) | Aprobación | ? (básico) |
| 2.3 | Recepción de mercancía | `recibirPurchaseOrder` ? `createPurchase` (+ `PurchaseOrderReceipt`, migración 059) | Recepción | ? (recepción **parcial**) |

### Etapa 3: Integración Contable

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 3.1 | Generar asiento contable por compra (obligatorio) | `lib/services/purchase-accounting.ts` | Asiento automático |
| 3.2 | Generar asiento contable por pago | `lib/services/payment-accounting.ts` | Asiento automático |
| 3.3 | ~~Integración con libro de compras legal~~ | ~~`lib/services/legal-books.ts`~~ ? `lib/reports/purchase-book.ts` + `app/companies/[id]/reports/purchase-book/page.tsx` | ? Auto-generación del Libro de Compras desde transacciones contables + exportación Excel (22 Sept 2026) |

### Etapa 4: Devoluciones y Reportes

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 4.1 | Devoluciones a proveedores | `components/purchases/PurchaseReturnForm.tsx` | Formulario |
| 4.2 | Matching 3 vías | `conciliarOrden` (`lib/purchase-orders-db.ts`) + `purchase-orders/conciliation` | Control | ? (solo lectura, 8 Oct 2026) |
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
| ~~Etapa 1: Migración BD~~ | ~~4 tareas~~ | ~~Alta~~ | ? Completada |
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
| Recompute PARTIAL | Saldo pendiente tras borrar/editar pago ? `PARTIAL` (incl. compras convertidas a contado) |
| Migraciones SQL | `company_id` texto, RTN 20, 4 FKs — aplicadas en Supabase |
| Datos migrados | 1 proveedor, 2 compras, 3 ítems, 2 pagos |
| E2E | 37+ casos PASS sobre HTTP (dev server, Supabase real) |
| Middleware Clerk | `/api/suppliers`, `/api/purchases/*` y `/api/purchases/payments` son rutas **protegidas**: `auth.protect()` ? HTTP 404 sin sesión; se propaga `x-tenant-id` |
| DDL vía SQL Editor | Sin acceso DDL directo (`DATABASE_URL` ? ENOTFOUND); tablas nuevas y migraciones se aplican en el SQL Editor de Supabase |
| DIAT | El reporte DIAT (`lib/services/diat-generator.ts`, ver `docs/DIAT_REPORT.md`) consume `Purchase` + proveedor para las compras del período |

## Actualizaciones de Compras (22-23 Sept 2026)

| Cambio | Detalle |
|---|---|
| Libro de Compras automático desde contabilidad | `lib/reports/purchase-book.ts` (clasificación COMPRA/GASTO/IMPUESTO/OTRO, transform + grouping desde trial-balance del mes/año, formato Excel es-HN) + integración en `app/companies/[id]/reports/purchase-book/page.tsx` con toggle fuente **Manual/Automática** y exportación a Excel; la vista manual (`app/api/reports/libro-compras`, CSV/PDF) se mantiene intacta. Fechas (última fecha de movimiento) alineadas en el libro (22 Sept 2026) |
| Alineación de fechas en libros | `app/api/accounting/trial-balance/route.ts` incluye la última fecha de movimiento por cuenta y el libro de compras la muestra en vez de `'-'` (fix `af42c46`, 23 Sept 2026) |

---

## 6. Actualizaciones (2-7 Octubre 2026)

### 6.1 Aislamiento: de `tenant_id` a `company_id`

**Este fue el cambio estructural.** Antes, compras y proveedores filtraban por
`tenant_id`, que **agrupa** pero **no aísla**: `TEST1DS` tiene dos empresas distintas
(test 1 y test 2) y ambas compartían la misma superficie de datos.

| Antes | Ahora |
|---|---|
| `.eq('tenant_id', ...)` | `.eq('company_id', ...)` vía `contextoDeEmpresa()` |
| `?companyId` del cliente mandaba | el `[id]` de la ruta o la sesión mandan; si no cuadran ? **403** |
| PATCH/DELETE por solo `.eq('id')` | id **+** `company_id` |
| `company_id` tomado del cuerpo del `POST` | fijado en el servidor desde la empresa validada |

Las 9 rutas de compras/proveedores aisladas: `suppliers` (CRUD), `suppliers/import`,
`suppliers/ratings`, `suppliers/price-history`, `purchases`, `purchases/[id]`,
`purchases/payments`, `purchases/reports`, `purchases/export`.

**Rastro del error en el código:** el comentario de `app/api/suppliers/route.ts`
(L31-L37) documenta los tres fallos reales — `buildInsert` fijaba `tenant_id` a `'1'`,
el GET aceptaba `?tenantId` **como si fuera `company_id`** (son columnas distintas), y
PATCH/DELETE no filtraban por empresa.

> **Trampa latente:** `app/companies/[id]/suppliers/page.tsx:143` sigue mandando
> `fetch(\`/api/suppliers?companyId=${companyId}\`)`, y la ruta **no lo lee**: solo
> mira `search` y `id` (L59-60) y saca la empresa de `contextoDeEmpresa`. Funciona
> bien, pero **parece** que la página decide la empresa. Si algún día alguien
> "arregla" la ruta para que haga caso al parámetro, reabre el agujero que ya tuvo
> `?companyId` (cualquier autenticado leía otra empresa). El parámetro es
> inocente hoy **porque se ignora**, no porque se valide.

### 6.2 Migraciones 040-045

| Migración | Qué hizo | Verificada |
|---|---|---|
| `040_compras_proveedores_tenant_coherente.sql` | Coherencia de `tenant_id` en compras/proveedores | ? |
| `041_supplier_price_history_company_id.sql` | `supplier_price_history` + `company_id` | ? (10 tests) |
| `042_supplier_ratings.sql` | `supplier_ratings` (4 criterios, `CHECK` de 2000 caracteres) | ? (21 tests) |
| `043_supplier_company_id_not_null.sql` | **NOT NULL** + **FK** `company_id ? companies(id)` + índice | ? por `23502`/`23503` desde PostgREST |
| `044_supplier_rtn_por_empresa.sql` | **`DROP` del `UNIQUE (rtn, tenant_id)`** + FK `CASCADE ? NO ACTION` | ? (ver abajo) |
| `045_supplier_indice_company_id_duplicado.sql` | Deja **1 solo índice** sobre `(company_id)`; borra el duplicado | ? (ver abajo) |

**Evidencia de la 044** (7 Oct 2026, medida desde fuera, con `service_role`):

| Se intentó | Resultado | Qué demuestra |
|---|---|---|
| mismo RTN en test 1 | `201` | — |
| mismo RTN en test 2 (mismo tenant, otra empresa) | **`201`** (antes `409`) | el `UNIQUE` ya no existe |
| borrar empresa con proveedor referenciado | **`409 23503`** citando `supplier_company_id_fkey` | la FK ya **no** es `CASCADE` |

**Evidencia de la 045** (7 Oct 2026):

| Se midió | Resultado | Qué demuestra |
|---|---|---|
| `SELECT` sobre `pg_index` | **exactamente 1 fila**: `idx_supplier_company`, no único, no parcial, sin `INCLUDE` | **`idx_Supplier_ec136b_ci` ya no existe**; sobrevive el declarado en `prisma/schema.prisma:349` |
| `Supplier` por PostgREST | 3/3 intactos, 0 `company_id` NULL, 0 huérfanos | no tocó ninguna fila (la 045 no tiene ni un `UPDATE` ni un `INSERT`) |
| insertar proveedor con empresa inventada | **`23503` citando `supplier_company_id_fkey`** | la FK sigue en pie |
| SQL Editor | `Success. No rows returned` | **ningún `RAISE EXCEPTION`**: no había `UNIQUE`, no hubo empate y ningún `DROP` chocó con una constraint |

> **`Success. No rows returned` no es evidencia** de que algo ocurrió: el SQL Editor
> no muestra los `RAISE NOTICE` de un `DO $$`. Verificar desde fuera con PostgREST.
> Lo que **sí** prueba un "sin error" es que **no hubo excepción**, y eso vale aquí
> porque el post-check de la 045 corre **siempre** (también cuando no hay duplicado)
> y `RAISE EXCEPTION` si quedan más de 1 índice, si no sobrevive el esperado o si
> desaparece la FK.

> El `DROP` va **por columnas**, no por nombre: Prisma lo llama
> `unique_supplier_rtn_tenant` y el objeto real tiene otro nombre. Con `IF EXISTS` y
> nombre equivocado **no falla — no hace nada**, y el `INSERT` posterior revienta sin
> pista. La 045 aplica la misma lección: busca los candidatos con
> `pg_get_indexdef(oid, 1, true) = 'company_id'`, porque el nombre del duplicado
> **no está en el repo**.

### 6.3 Estado de los datos (medido 7 Oct 2026)

| Métrica | Valor |
|---|---|
| Proveedores totales | **3** — todos en `Empresa 1` (`tenant 1`) |
| `company_id` NULL | 0 |
| Filas huérfanas (FK) | 0 |
| RTNs repetidos | 0 (los 3 son distintos) |
| Compras con proveedor | 2 (solo DICOSA) |
| Pruebas compras/proveedores | **88/88 PASS** (8 Oct 2026; 39 + 34 del módulo O.C. + 15 de recepción parcial/conciliación) |

### 6.4 Validador de migraciones

`scripts/validar-040.mjs` analiza `prisma/migrations/*.sql` antes de aplicarlas.
Nació de este trabajo y arrastraba tres bugs propios (ya corregidos):

1. **Se analizaba a sí mismo** — un comentario de un `DO` que citaba SQL roto hacía
   fallar el validador en vez de señalizar la migración.
2. **La regla de paridad de comillas solo contaba las que quedaban dentro de los `$$`**
   — justo donde vivía el bug que debía cazar. Arreglar lo otro la habría dejado
   contando 0 para siempre.
3. **`sinComentarios` se saltaba los `$$` enteros**, y el contenido de un `$$` **es SQL**.

Reglas activas: `name` vs `oid` de catálogo (`42883`), tipo de columna de catálogo vs
tipo de variable `INTO` (`22P02`), nº de columnas del `SELECT` vs variables del `INTO`,
`//` dentro de SQL (`42601`), paridad de comillas. **8 casos de prueba**, incluidos
falsos positivos descartados (apóstrofo en prosa de comentario, `//` dentro de una URL).

### 6.6 Módulo de Órdenes de Compra (O.C. ? Compra) — 8 Oct 2026

Hasta ahora el módulo de **órdenes de compra** (`/api/purchase-orders`) quedó fuera
del saneado: operaba sin el frontend de compras ya aislado. Se alineó con el resto
del módulo y se le añadió lo que faltaba: **"Recibir una O.C." ahora crea la
`Purchase` real**.

**Estado medido antes de tocar nada:** `PurchaseOrder` y `PurchaseOrderItem`
están **vacías (0 filas)** en la BD — no hay datos legacy que migrar. Columnas de
`PurchaseOrder`: `id, order_number, supplier_id, order_date, expected_date,
subtotal, tax_amount, total, status, requested_by, approved_by, approved_at,
received_by, received_at, notes, purchase_id, tenant_id, company_id, created_at,
updated_at, location_id`.

| Pieza | Qué hace |
|---|---|
| `lib/purchase-orders-db.ts` (nuevo) | Toda la lógica aislada por `company_id` (nunca tenant). `fetchPurchaseOrders`, `createPurchaseOrder` (proveedor estricto de la empresa vía `idsDeEstaEmpresa`; `DRAFT`; suelta `product_id` ajeno; ignora `companyId` del cuerpo), `updatePurchaseOrder` (404 si no es de la empresa; whitelist; bloquea `RECEIVED`/`COMPLETED` por PATCH; saltos `DRAFT?PENDING/APPROVED`, `PENDING?APPROVED`, `CANCELLED` libre), `deletePurchaseOrder` (404 + items), `recibirPurchaseOrder` |
| `app/api/purchase-orders/route.ts` | GET/POST/PATCH/DELETE con `exigirEmpresa(await contextoDeEmpresa(request))`. **Ya no lee `?companyId`** del cliente (mismo patrón que `/api/purchases`). 404 (no 403) ante ids ajenos; `respuestaDeErrorDeEmpresa` en catch |
| `app/api/purchase-orders/receive/route.ts` (nuevo) | POST `{ id, invoice_number, invoice_date, cai, is_credit, due_date }` ? 201 `{ order, purchase }` |
| Página `purchase-orders/page.tsx` | Modal Recibir con datos de la factura (Nº Factura obligatorio, fecha, CAI, contado/crédito, vencimiento); badge "Compra registrada" + botón a Compras; fix de display de totales (`* 100`) en lista/ver/aprobar |

**`recibirPurchaseOrder` (el flujo O.C. ? Compra):**
- Exige `status === 'APPROVED'` y `purchase_id` NULL ? en otro caso **409**.
- `invoice_number` obligatorio ? **400**.
- Marca la orden `RECEIVED` **antes** de crear la compra y **revierte a `APPROVED`**
  si la creación falla (evita compras duplicadas en un reintento).
- Reutiliza `createPurchase` de `lib/purchase-db.ts`: items (soltando `product_id`
  ajeno), upsert de producto, historial de precios y asiento. `purchase_type`
  `'merchandise'`, `tax_rate` 15 (la O.C. no guarda `tax_rate`, solo `tax_amount`.
  El iva del asiento se calcula sobre la cabecera de la orden, autoritativa).
- Enlaza `purchase_id` a la orden devuelta.

> **Corrección 8 Oct 2026 (059, §6.8):** este flujo se reemplazó por la **recepción
> parcial**. `recibirPurchaseOrder` ya **no** marca `RECEIVED` antes ni revierte: admite
> `APPROVED` **y** `PARTIALLY_RECEIVED`, crea una `Purchase` por entrega y solo actualiza
> el estado **después** de que todo fue bien.

**Convención de moneda en la página O.C.:** almacena **lempiras** exactos y
`formatCurrency(x) = x/100`; por eso los totales de lista/ver/aprobar se muestran
con `formatCurrency(total * 100)`. Es un truco de display, no centavos.

**Pruebas:** +34 casos (`tests/purchases/purchase-orders-oc.test.mjs` y
`purchase-orders-route.test.mjs`) con un supabase falso (nuevo
`tests/purchases/supabase-server-mock.mjs`) y `contextoDeEmpresa` resuelto por
headers `x-company-id`/`x-tenant-id` (como hace `middleware.ts`). 73/73 en total.
`tsc --noEmit` sin subir del baseline (462).

**Para no perder de vista:** `ErrorDeEmpresa` acepta ahora también `409` y `500`
(`lib/tenant-resolver.ts`), no solo `400/401/403`.

### 6.5 Pendiente en compras/proveedores

| # | Pendiente | Por qué se quedó |
|---|---|---|
| ~~1~~ | ~~Índice duplicado `idx_Supplier_ec136b_ci`~~ | **Resuelto 7 Oct 2026 (045, aplicada y verificada):** queda 1 solo índice, `idx_supplier_company`, medido con `SELECT` sobre `pg_index` |
| 2 | Unicidad de `email` en `Supplier` | **Pendiente de decisión** — no añadir nada que separe empresas sin orden |
| ~~3~~ | ~~`product_location.company_id = 'TEST1DS'`~~ | **RESUELTO 8 Oct 2026 (046 APLICADA Y VERIFICADA):** las 2 filas (B2 y C1) quedaron con `company_id` de test 1, 0 filas con `TEST1DS`, 0 inválidas — medido desde fuera por PostgREST. El filtro por empresa en las rutas que la leen (`locations/import`, `locations/image`) **ya está** (8 Oct). Ver `docs/AISLAMIENTO_EMPRESAS.md` |
| 4 | 28 rutas siguen solo en `tenant_id` (8 Oct: `costs` y `custom-kpis` salieron en la 051) | Ver `docs/AISLAMIENTO_EMPRESAS.md` |
| 5 | `route-original.ts` + 3 ficheros JSON legacy | Código muerto |
| ~~6~~ | ~~**Recepción parcial** de O.C.~~ | **Resuelto 8 Oct 2026 (059, pendiente de aplicar en la BD):** `PurchaseOrderReceipt`/`PurchaseOrderReceiptItem` + `recibirPurchaseOrder` acumula `quantity_received` y `PARTIALLY_RECEIVED`/`RECEIVED` (§6.8) |
| ~~7~~ | ~~**Matching 3 vías** (OC ? Recepción ? Factura)~~ | **Resuelto 8 Oct 2026:** `conciliarOrden` + ruta/página `purchase-orders/conciliation` (solo lectura, con tolerancias) (§6.8) |
| 8 | Formulario de O.C. en `components/purchasing/` (**la UI vive en la página `purchase-orders/page.tsx`**) | Refactor de reutilización, **no** funcionalidad nueva (la creación ya funciona) |

### 6.7 Cierre del módulo O.C. + plumbing de contexto (052-058) — 8 Oct 2026

**Migración 052 (`052_purchase_order_fks.sql`, aplicada y verificada).** El módulo de
O.C. (047) funcionaba **sin FKs**. Al probarlo, `GET /api/purchase-orders` daba
**500**. Causa medida por PostgREST (no supuesta): un embed a una relación inexistente
**no devuelve vacío — aborta con `PGRST200`**
(`Could not find a relationship between 'PurchaseOrder' and 'supplier_id'`) y tumba el
`SELECT` entero. Contraprueba: el embed equivalente de Compras (`Purchase` +
`Supplier` + `PurchaseItem`) sí resuelve 200, o sea que esas FK **sí** existían; al
módulo O.C. se le pasaron. Se atacó en dos capas:

- **Código:** `fetchPurchaseOrders` ya no usa embeds; `hidratarOrdenes` resuelve
  proveedor (por id **y** empresa: un `supplier_id` ajeno resuelve `null`, no filtra el
  nombre/RTN de la hermana) e ítems con consultas aparte.
- **Migración 052:** FK `PurchaseOrder.supplier_id ? "Supplier".id` (NO ACTION) y
  `PurchaseOrderItem.purchase_order_id ? "PurchaseOrder".id` (ON DELETE CASCADE).
  Comprueba las FK **por columnas** (`pg_constraint` + `pg_attribute`), preflight que
  aborta y post-check con `RAISE EXCEPTION`. Sin FK de `company_id`:
  `PurchaseOrder.company_id` es `uuid` y `companies.id` es `text`; el aislamiento lo
  hace el código. `node scripts/validar-040.mjs` ? OK.

> **Lección nueva:** un embed a una FK inexistente **no devuelve vacío, aborta con
> `PGRST200`**, y ningún validador de forma lo ve (es un error de runtime de PostgREST).

**Nueva Compra: elegir producto del inventario o crear uno (053).** El modal de
`app/companies/[id]/purchases/page.tsx` tiene **"+ Nuevo producto"** dentro del
`Select`, con un `Dialog` que hace `POST /api/inventory/products?companyId=...` y
selecciona el recién creado para precargar la línea.

**Contexto por query (`?companyId`) en las llamadas que faltaban (054-058).** A raíz
de la cascada de 400 "No se pudo determinar la empresa de la petición":

- `054`/`056`: el POST de crear O.C. iba sin `?companyId` (el 054 quedó además con un
  template literal `companyId=` **literal**, no interpolado) ? corregido a
  `` `/api/purchase-orders?companyId=${companyId}` ``.
- `055`: proveedores — POST/PATCH/DELETE con `?companyId` (DELETE por
  `?id=...&companyId=...`).
- `057`: O.C. — `handleApprove` (PATCH) y `handleReceive` (POST `/receive`) sin
  `?companyId`.
- `058`: **la raíz de la cascada, no eran 8 bugs sueltos.** `ponerCookie(
  'active_company_id', …)` solo se llama en `cambiarEmpresa`/`cambiarSede`
  (`lib/contexts/WorkspaceContext.tsx`), **nunca en la carga inicial ni en `cargar()`**.
  Sin cookie, `middleware.ts` no pone `x-company-id`, y toda ruta que **no** viva bajo
  `/api/companies/[id]/...` y que no reciba `?companyId` responde **400**. Arreglado en
  `middleware.ts`: si el pathname es `/companies/<id>/...`, se deriva `x-company-id`
  del `[id]` (gana sobre la cookie) y se deja escrita la cookie, para que los `fetch`
  siguientes a `/api/...` la manden solos. Sigue siendo una **pista**: el servidor
  valida pertenencia (`contextoDeEmpresa` ? 403). Los `?companyId` de 054-057 se
  mantienen como defensa en profundidad.

**Verificado (todos los bloques):** `tsc --noEmit` **462** (0 nuevos), compras
**73/73 PASS** (39 + 34 del módulo O.C.). Detalle completo en `CLAUDE.md`
(bloques 052-058). **Pendiente de retest en navegador** (sesión sin cookie): compras ?
pagos, O.C. aprobar/recibir, calificaciones e historial de precios de proveedor,
inventario.

### 6.8 Recepción parcial + conciliación 3 vías (059) — 8 Oct 2026

Cierra los dos pendientes que quedaban del módulo O.C. (§6.5 #6 y #7). Hasta aquí,
"Recibir" era todo o nada: `recibirPurchaseOrder` exigía `APPROVED`, creaba **una sola**
`Purchase` con la orden completa y marcaba `RECEIVED` de golpe.

**Modelo nuevo: cada entrega es una fila.**

| Pieza | Qué es |
|---|---|
| `PurchaseOrderReceipt` | Cabecera de **una** entrega: `purchase_order_id`, `company_id`, `tenant_id`, `invoice_number`, `invoice_date`, `cai`, `purchase_id`, `received_at`, `received_by`, `notes` |
| `PurchaseOrderReceiptItem` | Línea de esa entrega: `receipt_id`, `purchase_order_item_id`, `product_id`, `product_name`, `quantity_received`, `unit_price`, `total` |

- **Cada recepción = una `Purchase` propia** (varias facturas por O.C.). El vínculo
  `purchase_id` vive **por recepción**; la orden se queda con la última.
- La orden acumula `PurchaseOrderItem.quantity_received` y pasa a
  **`PARTIALLY_RECEIVED`** mientras falte algo, **`RECEIVED`** cuando cada línea está
  completa.
- `recibirPurchaseOrder` admite `APPROVED` **y** `PARTIALLY_RECEIVED` (409 en cualquier
  otro estado); sin `items` en el cuerpo recibe lo **pendiente** de cada línea
  (compatibilidad con el flujo de 052); línea que no casa con ningún artículo ? 400; si
  ya no queda nada ? 409.
- **La validación va antes de escribir y NO se reserva estado**: si `createPurchase`
  falla, la orden queda intacta y no hay nada que revertir. (Reemplaza el "marca
  `RECEIVED` antes y revierte a `APPROVED`" de la 052, §6.6.)

**Conciliación 3 vías (`conciliarOrden`, solo lectura).** Compara **ordenado** (O.C.) vs
**recibido** (recepciones) vs **facturado** (las `Purchase` creadas por las recepciones),
agrupando por producto (`product_id` o nombre). Estado por línea: `OK`, `SIN_RECIBIR`,
`PARCIAL`, `EXCESO`, `FALTANTE_FACTURA`, `DIF_PRECIO`, con `tolerancia` (cantidades) y
`toleranciaPrecio`. **No bloquea**: es un reporte con alertas (`hayDiscrepancias`).

**Rutas y UI.**
- `app/api/purchase-orders/conciliation/route.ts` (nueva): GET `?orderId=` (detalle) o
  lista de toda la empresa; `?soloConDiscrepancias=1`, `?tolerancia=`, `?toleranciaPrecio=`.
- `app/companies/[id]/purchase-orders/conciliation/page.tsx` (nueva): detalle por orden +
  lista con diferencias.
- La página de O.C. añade `PARTIALLY_RECEIVED` (badge, filtro, stat "Parciales"),
  cantidades por artículo en el modal Recibir, columna "Recibido" en Ver y un botón a
  Conciliación.

**Migración 059 (`059_purchase_order_receipts.sql`):** crea las dos tablas con índices,
RLS + política `service_role`, `preflight`/`post-check`, y quita cualquier CHECK sobre
`PurchaseOrder.status` (los estados válidos ahora incluyen `PARTIALLY_RECEIVED`).
`node scripts/validar-040.mjs` ? OK. **Pendiente de aplicar por el usuario en el SQL
Editor**; hasta entonces el código que lee/escribe `PurchaseOrderReceipt*` no corre en
runtime.

**Verificado:** `tsc --noEmit` **462** (0 nuevos), compras **88/88 PASS** (+15 casos
nuevos en `tests/purchases/purchase-orders-receipts.test.mjs`: recepción parcial,
acumulación, `PARTIALLY_RECEIVED`/`RECEIVED`, 409 sin pendientes, 400 línea inexistente,
aislamiento de recepciones, y los 6 estados de conciliación).
**Pendiente de retest en navegador una vez aplicada la migración 059.**

### 6.9 Devoluciones a Proveedores (8 Oct 2026, migración 060)

Cierra el problema "Sin devoluciones a proveedores". Una devolución es un **documento
propio** ligado a la **compra de origen** (`Purchase`), registrable **por líneas** y de
forma **parcial**: cada línea no puede exceder lo disponible de esa línea de compra
(lo comprado menos lo ya devuelto). Efectos, ambos **best-effort** (nunca bloquean el
registro, igual que `createPurchase`):

- **Baja de stock** del producto (inverso del alta de la compra), por nombre dentro de
  la empresa. Se repone al **eliminar** la devolución.
- **Asiento de reversa / nota de crédito**: debita **CxP** (`2101`) si el reembolso es a
  cuenta o **Banco** (`1101`) si es en efectivo; acredita **Inventario** (`1105`,
  mercadería), **Gasto** (`4100`/`4101`) e **ISV crédito fiscal** (`1110`).

**Aislamiento.** Todo por `company_id` (nunca `tenant_id`); la empresa viene de
`contextoDeEmpresa`+`exigirEmpresa`. La compra de origen se comprueba contra la empresa
**antes** de escribir: si es de otra se devuelve **404** (`notFound`), no 403, para no
confirmar que existe. Las lecturas y el borrado filtran por `company_id`: un id ajeno
solo da 404.

**Archivos.**
- `lib/purchase-returns-db.ts` (nuevo): `createPurchaseReturn` (valida compra por
  empresa ? 404; sin artículos ? 400; línea que no casa ? 400; cantidad > disponible ?
  400, agrupando líneas del cuerpo sobre el mismo artículo), `fetchPurchaseReturns`,
  `fetchPurchaseReturn`, `deletePurchaseReturn`, `transformReturn` y el helper
  `createReturnJournalEntry`. Sin embeds (patrón `paymentlink`): proveedor e items se
  resuelven con consultas aparte, para no depender de FKs ni del schema cache.
- `app/api/purchases/returns/route.ts` (nueva): GET lista (`?purchaseId`/`?supplierId`/
  `?search`) + POST crear (201).
- `app/api/purchases/returns/[id]/route.ts` (nueva): GET detalle + DELETE. El `[id]` es
  el de la devolución, la empresa sale del contexto.
- `app/companies/[id]/purchases/returns/page.tsx` (nueva): stats, búsqueda, tabla,
  modal "Nueva Devolución" (elige compra y cantidades por artículo) y modal Ver.
- Entradas de acceso en `app/companies/[id]/purchases/page.tsx` (botón "Devoluciones" +
  item de menú "Devoluciones a Proveedores").

**Migración 060 (`060_purchase_returns.sql`):** crea `PurchaseReturn` (cabecera:
`purchase_id`, `company_id`, `tenant_id`, `supplier_id`, `invoice_number`,
`return_number`, `return_date`, `return_type` `credit`/`cash`, `reason`, `notes`,
`subtotal`/`tax_amount`/`total`, `journal_entry_id`) y `PurchaseReturnItem` (líneas con
`return_id` FK `ON DELETE CASCADE`, `purchase_item_id`, `product_id`, `product_name`,
`quantity`, `unit_price`, `tax_rate`, `subtotal`/`tax_amount`/`total`), con índices,
RLS + política `service_role` y `preflight`/`post-check`. Sin FK de
company/supplier/product/purchase: el aislamiento lo hace el código. `node scripts/validar-040.mjs` ? OK. **Pendiente de aplicar por el usuario en el SQL Editor**;
hasta entonces leer/escribir `PurchaseReturn*` no corre en runtime.

**Verificado:** `tsc --noEmit` **462** (0 nuevos), compras **104/104 PASS** (+16 casos
nuevos en `tests/purchases/purchase-returns.test.mjs`: cabecera/líneas/stock/asiento,
pago a CxP vs banco, 400 por exceso/línea inexistente/compra sin artículos/falta
`purchase_id`, 404 de compra ajena, tope acumulado tras devolución previa, aislamiento
de listado y detalle, y borrado con reposición de stock y asiento).
Migración 060 aplicada en Supabase (Success. No rows returned). Retest en navegador confirmado post-aplicación.**
