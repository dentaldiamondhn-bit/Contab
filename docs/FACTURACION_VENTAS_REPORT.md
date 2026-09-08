# Reporte de Estado y Plan de Ejecución: Facturación y Ventas

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Facturación** | Parcial | 1 componente | 3 rutas | 2 tablas (dual schema) | Supabase + Prisma |
| **Gestión de Clientes** | Completo | 1 componente | 1 ruta | 1 tabla | Supabase |
| **Cuentas por Cobrar** | Parcial | 1 componente | — | 1 tabla | Supabase |
| **Gestión CAI** | Completo | 1 dashboard | 6 rutas | 2 tablas | Supabase + Prisma |
| **Notas de Crédito/Débito** | No Iniciado | 0 | 0 | Schema existe | — |
| **Cotizaciones/Proformas** | No Iniciado | 0 | 0 | 0 | — |
| **Órdenes de Venta** | No Iniciado | 0 | 0 | 0 | — |
| **Dashboard de Ventas** | Completo | 1 dashboard | 1 ruta | — | Supabase |
| **Libro de Ventas Legal** | Completo | 1 página | 1 ruta | 1 vista | Supabase |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~55% | Facturación y clientes base; sin notas, cotizaciones, órdenes |
| Cobertura de Pruebas | 0% | No existen pruebas |
| Persistencia | ~70% | Supabase para la mayoría; dual schema (invoice lowercase + Invoice PascalCase) |
| Cumplimiento Fiscal | ~60% | CAI y campos fiscales en factura; sin notaspdf |
| Integración | ~40% | Facturación no genera asiento contable automáticamente |

---

## 2. Inventario Detallado

### 2.1 Facturación

**Estado: Parcial (~55%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/sales/InvoiceForm.tsx` | Formulario de creación: selección de cliente, líneas de detalle, cálculo de impuestos, productos de inventario, numeración automática |
| `app/api/billing/invoices/route.ts` | API POST: crea facturas (tabla `invoice` lowercase, centavos) |
| `app/api/billing/invoices/simple/route.ts` | API simplificada de facturación |
| `lib/billing/invoice-generator.ts` | Generador server-side de facturas de suscripción (automático mensual para tenants) |

#### Tablas de Base de Datos

- `invoice` (lowercase, Supabase) — id, invoice_number, cai, customer_rtn, customer_name, subtotal, tax_15, tax_18, total, payment_method, status, date, tenant_id
- `invoiceitem` (lowercase, Supabase) — id, invoice_id, product_code, product_name, quantity, unit_price, tax_rate, discount, subtotal, tax_amount, total
- `Invoice` (PascalCase, Prisma) — Esquema completo con CAI, fechas, tipo, ítems JSON, impuestos
- `InvoiceItem` (PascalCase, Prisma) — Líneas con taxrate, taxamount

#### Lo que Falta

- **Dual schema inconsistente** (dos tablas de factura paralelas)
- Sin generación de PDF de factura
- Sin impresión de factura
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

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | Dual schema de facturas (lowercase + PascalCase) | Confusión, duplicación | Crítica |
| 2 | Sin generación de PDF de factura | Imposible entregar facturas | Crítica |
| 3 | Sin notas de crédito/débito | Incumplimiento fiscal | Crítica |
| 4 | Sin cotizaciones/proformas | Sin proceso de ventas | Alta |
| 5 | Facturación sin integración contable | Doble registro | Alta |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Consolidación de Esquema y PDF

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 1.1 | Consolidar esquemas de factura en uno solo | Migraciones SQL, modelos | Esquema único |
| 1.2 | Generación de PDF de factura | `lib/services/invoice-pdf.ts` | PDF funcional |
| 1.3 | Plantilla HTML de factura | `templates/invoice.html` | Plantilla profesional |

### Etapa 2: Notas de Crédito/Débito

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 2.1 | UI de notas de crédito | `components/sales/CreditNoteForm.tsx` | Formulario funcional |
| 2.2 | UI de notas de débito | `components/sales/DebitNoteForm.tsx` | Formulario funcional |
| 2.3 | API de notas | `app/api/billing/notes/route.ts` | API CRUD |
| 2.4 | Integración con facturas y contabilidad | `lib/services/notes-service.ts` | Integración |

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
    ├── Etapa 2 (Notas de Crédito/Débito)
    ├── Etapa 3 (Cotizaciones + Órdenes)
    └── Etapa 4 (Integración Contable)
            └── Etapa 5 (QA)
```

---

## 6. Estimación de Esfuerzo

| Etapa | Tareas | Complejidad | Estimación |
|---|---|---|---|
| Etapa 1: Consolidación | 3 tareas | Alta | 2-3 semanas |
| Etapa 2: Notas | 4 tareas | Alta | 2-3 semanas |
| Etapa 3: Cotizaciones | 3 tareas | Media | 2-3 semanas |
| Etapa 4: Integración | 3 tareas | Alta | 2-3 semanas |
| Etapa 5: QA | 2 tareas | Media | 1 semana |
| **Total** | **15 tareas** | — | **9-13 semanas** |

---

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 15.5.25 | Downgraded desde 16.x (bug de Turbopack con .nft.json en Vercel) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |
