# Reporte de Estado y Plan de Ejecución: Compras y Proveedores

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Gestión de Proveedores** | Parcial | 1 componente | 1 ruta | 1 tabla | Supabase + JSON |
| **Órdenes de Compra** | Básico | 1 componente (listado) | 1 ruta | 2 tablas | Supabase |
| **Registro de Compras** | Parcial | 1 página (1630 líneas) | 2 rutas | — | **JSON files** |
| **Pagos a Proveedores** | Parcial | 1 componente | 1 ruta | — | **JSON files** |
| **Cuentas por Pagar** | Parcial | En SupplierManager | — | 1 tabla | Supabase |
| **Devoluciones** | No Iniciado | 0 | 0 | 0 | — |
| **Listas de Precios** | No Iniciado | 0 | 0 | 0 | — |
| **Dashboard de Compras** | Completo | 1 página | 1 ruta | — | Supabase |
| **Libro de Compras Legal** | Completo | 1 página | 1 ruta | 1 vista | Supabase |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~35% | Proveedores y dashboard funcionan; compras usan JSON files |
| Cobertura de Pruebas | 0% | No existen pruebas |
| Persistencia | ~25% | **CRÍTICO: Compras y pagos usan archivos JSON, no base de datos** |
| Integración Contable | ~20% | Compras no generan asiento contable automático |
| Workflow de Compra | ~15% | Sin aprobación, recepción parcial, matching 3 vías |

---

## 2. Inventario Detallado

### 2.1 Gestión de Proveedores

**Estado: Parcial (~50%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/purchasing/SupplierManager.tsx` | CRUD de proveedores + Cuentas por Pagar: seguimiento de pagables, procesamiento de pagos, exportación CSV |
| `app/api/suppliers/route.ts` | API CRUD — **LEE/ESCRIBE `suppliers-data.json`** (NO base de datos) |
| `app/companies/[id]/suppliers/page.tsx` | Página de proveedores por empresa |

#### Tabla de Base de Datos

- `Supplier` (referenced, Supabase) — id, rtn, name, email, phone, address, creditLimit, currentBalance, isActive, tenantId

#### Lo que Falta

- **API usa archivo JSON** en lugar de Supabase (inconsistente con el componente)
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

- `PurchaseOrder` (referenced) — id, orderNumber, status, totalAmount, tenant_id, supplier_id, order_date, expected_date, subtotal, tax_amount, total, notes
- `PurchaseOrderItem` (referenced) — purchaseOrderId, product_id, product_name, quantity, unit_price, total

#### Lo que Falta

- **Sin formulario de creación de órdenes** (solo listado)
- Sin workflow de aprobación
- Sin recepción de mercancía
- Sin matching 3 vías (OC → Recepción → Factura)

---

### 2.3 Registro de Compras

**Estado: Parcial (~40%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/purchases/page.tsx` | Página completa (1630 líneas): CRUD de compras con ítems, proveedores, CAI, cálculo de impuestos, integración con PaymentManager |
| `app/api/purchases/route.ts` | API — **LEE/ESCRIBE `purchases-data.json`** + actualiza stock en Supabase |
| `app/api/purchases/[id]/route.ts` | API individual |
| `app/api/purchases/reports/route.ts` | Reportes: resumen, mensual, por categoría, por proveedor |
| `app/api/purchases/export/route.ts` | Exportación de datos |

#### Lo que Falta

- **ALMACENAMIENTO EN ARCHIVO JSON** — datos se pierden, no hay respaldo, no escalable
- Sin integración contable automática
- Sin matching con órdenes de compra
- Sin workflow de aprobación

---

### 2.4 Pagos a Proveedores

**Estado: Parcial (~35%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/purchases/PaymentManager.tsx` | CRUD de pagos: métodos de pago (efectivo, transferencia, cheque, tarjeta), seguimiento de saldo |
| `app/api/supplier-payments/route.ts` | API — **LEE/ESCRIBE `supplier-payments.json`** |
| `app/api/purchases/payments/route.ts` | API de pagos de compras |

#### Lo que Falta

- **ALMACENAMIENTO EN ARCHIVO JSON**
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
| 1 | Compras, proveedores y pagos usan archivos JSON | Datos no persistentes, no escalable, sin respaldo | **Crítica** |
| 2 | Sin formulario de creación de órdenes de compra | Funcionalidad incompleta | Crítica |
| 3 | Sin integración contable de compras | Doble registro manual | Alta |
| 4 | Sin devoluciones a proveedores | Sin control de calidad | Alta |
| 5 | Sin matching 3 vías | Sin control de compras | Media |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Migración a Base de Datos

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 1.1 | Migrar proveedores de JSON a Supabase | `app/api/suppliers/route.ts` | API con Supabase |
| 1.2 | Migrar compras de JSON a Supabase | `app/api/purchases/route.ts` | API con Supabase |
| 1.3 | Migrar pagos de JSON a Supabase | `app/api/supplier-payments/route.ts` | API con Supabase |
| 1.4 | Script de migración de datos JSON existentes | `scripts/migrate-json-to-supabase.ts` | Migración |

### Etapa 2: Workflow de Compras

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 2.1 | Formulario de creación de órdenes de compra | `components/purchasing/PurchaseOrderForm.tsx` | Formulario |
| 2.2 | Workflow de aprobación | `lib/services/po-approval.ts` | Aprobación |
| 2.3 | Recepción de mercancía | `components/purchasing/ReceivingForm.tsx` | Recepción |

### Etapa 3: Integración Contable

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 3.1 | Generar asiento contable por compra | `lib/services/purchase-accounting.ts` | Asiento automático |
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
| 5.1 | Pruebas de compras y pagos | `__tests__/purchasing/` | Pruebas unitarias |
| 5.2 | Pruebas E2E de flujo de compras | `__tests__/e2e/purchasing/` | Pruebas E2E |

---

## 5. Estimación de Esfuerzo

| Etapa | Tareas | Complejidad | Estimación |
|---|---|---|---|
| Etapa 1: Migración BD | 4 tareas | Alta | 2-3 semanas |
| Etapa 2: Workflow | 3 tareas | Alta | 3-4 semanas |
| Etapa 3: Contabilidad | 3 tareas | Media | 2-3 semanas |
| Etapa 4: Devoluciones | 3 tareas | Media | 2-3 semanas |
| Etapa 5: QA | 2 tareas | Media | 1 semana |
| **Total** | **15 tareas** | — | **10-14 semanas** |

---

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 15.5.25 | Downgraded desde 16.x (bug de Turbopack con .nft.json en Vercel) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |
