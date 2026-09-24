# Reporte de Estado y Plan de Ejecución: Control Financiero

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Conciliación Bancaria** | Parcial | 1 componente | 1 ruta | 1 tabla | Supabase |
| **Gestión de Efectivo** | Parcial | 1 componente | — | — | Supabase |
| **Proyección de Flujo** | Completo | 1 chart + servicio | 1 ruta | — | Supabase |
| **Punto de Equilibrio** | Completo | 1 chart | 1 ruta | — | Cálculos |
| **Multi-Divisa** | Parcial | 1 página (datos hardcodeados) | 1 ruta | En Transaction | Prisma |
| **Presupuestos** | Completo (Etapa 1) | 1 tab + componente | 3 rutas | 2 tablas | Supabase |
| **Centros de Costo** | No Iniciado | 0 | 0 | 0 | — |
| **Caja Chica** | No Iniciado | 0 | 0 | 0 | — |
| **Inter-Empresas** | No Iniciado | 0 | 0 | 0 | — |
| **KPIs de Empresa (datos reales)** | Completo (23 Sept 2026) | `app/companies/[id]/financial-control/page.tsx` | 1 ruta (`app/api/companies/[id]/kpis/route.ts`) | — | Supabase |
| **Reporte de Ocupación (datos reales)** | Completo (23 Sept 2026) | `app/companies/[id]/business-reports/page.tsx` | 1 ruta (`app/api/companies/[id]/reports/occupancy/route.ts`) | — | Supabase |
| **Dashboard Stats (datos reales)** | Completo (23 Sept 2026) | dashboard master | 1 ruta (`app/api/dashboard/stats/route.ts`) | — | Supabase |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~60% | Etapa 1 (presupuestos) completa; KPIs de empresa, dashboard stats y reporte de ocupación conectados a datos reales (sin figuras fabricadas, 23 Sept 2026); sin centros de costo |
| Cobertura de Pruebas | Parcial | 20 tests node:test en presupuestos (cálculo + rutas API) |
| Persistencia | ~55% | Conciliación y presupuestos en Supabase; multi-divisa en Prisma |
| Analítica Financiera | ~60% | Proyecciones, break-even y control presupuestario (vs real + alertas) |

---

## 2. Inventario Detallado

### 2.1 Conciliación Bancaria

**Estado: Parcial (~50%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/financial/BankReconciliation.tsx` | UI: comparar saldo de estado de cuenta vs saldo contable, estados (PENDING/MATCHED/DIFFERENCE), CRUD, CSV export |
| `app/lib/services/reconciliation.ts` | Algoritmo de coincidencia automática (monto y fecha ±3 días) |
| `app/api/reconcile-bank/route.ts` | API de conciliación |

#### Tabla

- `Reconciliation` (Supabase vía RPC `set_tenant`)

#### Lo que Falta

- Sin conciliación a nivel de línea individual
- Sin matching inteligente (solo monto + fecha)
- Sin historial de conciliaciones

---

### 2.2 Gestión de Efectivo y Proyección

**Estado: Completo (~70%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/financial/CashFlowManager.tsx` | UI de entradas/salidas de efectivo |
| `lib/services/cash-flow-projection-service.ts` | Servicio de proyección (594 líneas): proyecciones 30 días, análisis de recebibles/pagables, transacciones recurrentes, pronóstico ponderado por probabilidad |
| `components/dashboard/CashFlowProjectionChart.tsx` | Chart Recharts interactivo (área/barras/líneas), toggle de probabilidad, estado de salud, advertencias |
| `app/api/cash-flow-projection/route.ts` | API de proyección |

#### Lo que Falta

- Sin gestión de fondo de caja chica (imprest)
- Sin seguimiento de custodia

---

### 2.3 Punto de Equilibrio

**Estado: Completo (~80%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/dashboard/BreakEvenChart.tsx` | Análisis de punto de equilibrio con comparación de escenarios, margen de contribución, margen de seguridad |
| `components/dashboard/BurnRateChart.tsx` | Visualización de burn rate |
| `components/dashboard/TremorBurnRateChart.tsx` | Burn rate alternativo con Tremor |
| `app/api/break-even/route.ts` | API de cálculo |

---

### 2.4 Multi-Divisa

**Estado: Parcial (~45%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/services/multi-currency.ts` | Obtención de tipos de cambio, conversión, formato, validación de saldos |
| `lib/services/multi-currency-server.ts` | Creación de transacciones multi-divisa server-side con conversión a moneda funcional (HNL) |
| `lib/services/currency-validation.ts` | Validación (313 líneas): código de moneda, rango de tipo de cambio, detección de anomalías, precisión BigInt |
| `lib/currency-utils.ts` | Formato con precisión BigInt, parsing, validación RTN |
| `components/ui/currency-input.tsx` | Componente UI de entrada de moneda |
| `app/multi-currency/page.tsx` | Página de multi-divisa (**datos hardcodeados**) |
| `app/api/exchange-rate/route.ts` | API de tipo de cambio |

#### Lo que Falta

- Página multi-divisa usa datos hardcodeados
- Sin tabla persistente de tipos de cambio
- Sin integración BCH en tiempo real
- Sin soporte EUR en UI

---

### 2.5 KPIs de Empresa, Dashboard y Ocupación con Datos Reales (23 Sept 2026)

**Estado: Completo** — eliminación de figuras fabricadas (mocks) en las métricas del control financiero y del dashboard.

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/api/companies/[id]/kpis/route.ts` | KPIs de empresa desde agregados reales de la base de datos (ocupación/actividad), con estados vacíos honestos sin números inventados (antes mock 75%); la tarjeta de ocupación en `app/companies/[id]/financial-control/page.tsx` muestra los mismos datos reales (23 Sept 2026) |
| `app/api/companies/[id]/reports/occupancy/route.ts` | Reporte de ocupación desde agregados reales; sin datos devuelve tasas `null` (empty state honesto) en vez de los mocks 78/95/45; `app/companies/[id]/business-reports/page.tsx` conexionado al reporte real con su empty state (23 Sept 2026) |
| `app/api/dashboard/stats/route.ts` | Estadísticas del dashboard master desde la base de datos (sin números demo de alta severidad) |
| `app/api/companies/route.ts`, `app/api/companies/[id]/cashflow/route.ts`, `app/api/companies/[id]/costs/route.ts`, `app/api/companies/[id]/custom-kpis/route.ts`, `app/companies/[id]/accounting/page.tsx` | Datos reales de empresas, cash flow, costos y KPIs personalizados conectados a la base de datos en lugar de demo data (23 Sept 2026) |

#### Nota

La conversión "alta severidad demo → datos reales" (commit `fcc8534`) también cubrió control financiero de CAI (billing) y las revisiones legales (`app/api/companies/[id]/legal/revisiones/route.ts` + `storage.ts`); ver §1.1 y `docs/FACTURACION_VENTAS_REPORT.md`.

---

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | Sin centros de costo | Sin asignación de costos | Alta |
| 2 | Página multi-divisa hardcodeada | Función inutilizable | Alta |
| 3 | Sin caja chica | Sin control de efectivo menor | Media |
| 4 | Sin operaciones inter-empresas | Sin consolidación | Media |

> Problema anterior #1 (Sin presupuestos) resuelto el 17 Sept 2026 — ver § "Actualizaciones de Presupuestos".

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Presupuestos ✅ Completada (17 Sept 2026)

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 1.1 | ✅ Modelo de datos de presupuestos | `supabase/BUDGET_TABLES.sql` | Tablas `budgets` + `budget_lines` |
| 1.2 | ✅ CRUD de presupuestos | `lib/services/budget-service.ts` + `lib/services/budget-calc.ts` + API `app/api/companies/[id]/budgets/**` (3 rutas) | Servicio + API |
| 1.3 | ✅ UI de gestión de presupuestos | Tab "Presupuestos" en `app/companies/[id]/financial-control/page.tsx` + `components/financial/BudgetsManager.tsx` | Tab + componente |
| 1.4 | ✅ Reporte presupuesto vs real | Vista de detalle del presupuesto (comparación mensual, varianzas, % ejecución, alertas, export CSV) | Control presupuestario |

### Etapa 2: Centros de Costo

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 2.1 | Modelo de centros de costo | `supabase/COST_CENTERS.sql` | Tablas SQL |
| 2.2 | Asignación de transacciones a centros | `lib/services/cost-center-service.ts` | Servicio |
| 2.3 | UI de centros de costo | `app/financial/cost-centers/page.tsx` | Página |
| 2.4 | Reportes por centro de costo | `app/reports/cost-centers/page.tsx` | Reportes |

### Etapa 3: Correcciones Multi-Divisa

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 3.1 | Conectar página multi-divisa a API real | `app/multi-currency/page.tsx` | Datos reales |
| 3.2 | Tabla persistente de tipos de cambio | `supabase/EXCHANGE_RATES.sql` | Almacenamiento |
| 3.3 | Integración con BCH (Banco Central de Honduras) | `lib/services/bch-rate.ts` | API externa |

### Etapa 4: Caja Chica y Extras

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 4.1 | Gestión de fondo de caja chica | `components/financial/PettyCash.tsx` | UI |
| 4.2 | Consulta de conciliación bancaria inteligente | `lib/services/reconciliation.ts` | Matching mejorado |
| 4.3 | Dashboard financiero consolidado | `app/financial/dashboard/page.tsx` | Dashboard |

### Etapa 5: QA

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 5.1 | Pruebas de presupuestos y centros de costo | `__tests__/financial/` | Pruebas |
| 5.2 | Pruebas E2E de control financiero | `__tests__/e2e/financial/` | Pruebas E2E |

---

## 5. Estimación de Esfuerzo

| Etapa | Tareas | Complejidad | Estimación |
|---|---|---|---|
| Etapa 1: Presupuestos | 4 tareas | Alta | ✅ Completada (17 Sept 2026) |
| Etapa 2: Centros de Costo | 4 tareas | Alta | 3-4 semanas |
| Etapa 3: Multi-Divisa | 3 tareas | Media | 2-3 semanas |
| Etapa 4: Extras | 3 tareas | Media | 2-3 semanas |
| Etapa 5: QA | 2 tareas | Media | 1 semana |
| **Total (pendiente)** | **12 tareas** | — | **9-12 semanas** |

---

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 16.3.5 | Restaurado desde 15.5.25; build y dev OK en Vercel (16 Sept 2026) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |

## Actualizaciones de Control Financiero (16 Sept 2026)

| Cambio | Detalle |
|---|---|
| Asientos desde Facturación | Las notas de crédito/débito (`lib/services/notes-service.ts`) publican asientos `AJUSTE` vía `POST /api/accounting/transactions` (cuentas 4101/2105/1101/1103, header `x-tenant-id`, ISV 15% incluido) — alimentan la contabilidad y la conciliación del control financiero |
| Middleware Clerk | Rutas protegidas: `auth.protect()` → HTTP 404 sin sesión; inyecta `x-tenant-id`. Públicas acotadas (`/auth/*`, `/api/auth/*`, `/api/admin/plans-public`, `/api/paypal/*`, `/api/webhooks/*`, `/api/accounting/uploaded-files`, `/api/accounting/excel-upload`; `trial-balance` salió el 17 Sept 2026) |
| Fix env `SUPABASE_URL` | `app/api/companies/route.ts`: `SUPABASE_URL` (inexistente → 500) reemplazado por `NEXT_PUBLIC_SUPABASE_URL` |
| Build | `pnpm build` → `EXIT=0` (Next.js 16.3.5 + Turbopack, `output: 'standalone'`) |
| DDL | Sin acceso DDL directo (`DATABASE_URL` → ENOTFOUND); DDL vía SQL Editor de Supabase |

## Actualizaciones de Presupuestos (17 Sept 2026)

Etapa 1 completada: presupuestos anuales por empresa con líneas por cuenta contable y control presupuestario (presupuesto vs real con alertas).

| Cambio | Detalle |
|---|---|
| Tablas | `supabase/BUDGET_TABLES.sql`: `budgets` (tenant, empresa, nombre, año, tipo, estado) + `budget_lines` (cuenta, categoría ingreso/gasto, período YYYY-MM o NULL anual, monto); índices + RLS por tenant |
| Servicio | `lib/services/budget-service.ts`: CRUD, `resolveTenant` (header → `companies` → fallback), comparación contra mayor contable (`Transaction`/`JournalEntry`/`Account`, misma convención de signos que trial-balance); error amable si faltan las tablas |
| Cálculo puro | `lib/services/budget-calc.ts`: prorrateo anual /12, varianza dirigida (gasto = P−R, ingreso = R−P), % ejecución, estados ok/advertencia/crítico/sin-datos (umbrales gasto 90/100, ingreso 80/50) |
| API | `GET/POST /api/companies/[id]/budgets`, `GET/PUT/DELETE .../budgets/[budgetId]`, `GET .../[budgetId]/comparison?period=YYYY-MM` (400 validación, 404 no encontrado) |
| UI | Tab "Presupuestos" en Control Financiero (`components/financial/BudgetsManager.tsx`): lista, creación con selector de cuentas del catálogo, detalle con comparación mensual, alertas, totales con barras de ejecución, export CSV, activar/cerrar/eliminar |
| Tests | `tests/budgets/` (11 cálculo + 9 rutas, `node:test`); `npm test` → 26 pass (6 DIAT + 20 presupuestos) |
| Tendencia anual (17 Sept 2026) | `getBudgetTrend` en `budget-service.ts` (12 meses con la misma matemática del comparativo) + `GET .../budgets/[budgetId]/trend` + tabla mensual en el detalle (`BudgetsManager`, mes actual resaltado) |
| Tablas verificadas | `supabase/BUDGET_TABLES.sql` ejecutado sin errores; `budgets` y `budget_lines` confirmadas en Supabase vía REST (HTTP 200, vacías, 17 Sept 2026). El aviso de la UI solo aparece si las tablas llegaran a faltar |
| Build | `next build` → `EXIT=0`, 4 rutas de presupuestos registradas |

## Actualizaciones de Control Financiero (23 Sept 2026)

| Cambio | Detalle |
|---|---|
| Datos reales en dashboard/empresas/control financiero | `app/api/dashboard/stats/route.ts`, `app/api/companies/route.ts`, `app/api/companies/[id]/cashflow/route.ts`, `app/api/companies/[id]/costs/route.ts`, `app/api/companies/[id]/custom-kpis/route.ts`, `app/api/admin/billing/cai*`, `app/api/admin/billing/invoices*`, `app/api/billing/cai*` y `app/api/companies/[id]/legal/revisiones*` conectados a la base de datos — sin figuras fabricadas (demo de alta severidad eliminada) — commit `fcc8534` |
| KPIs de empresa con datos reales | `app/api/companies/[id]/kpis/route.ts`: agregados reales de la BD con empty states honestos; la tarjeta de ocupación en `app/companies/[id]/financial-control/page.tsx` refleja los mismos datos (se elimina el mock 75% de ocupación) — commit `45168bf` |
| Reporte de ocupación con datos reales | `app/api/companies/[id]/reports/occupancy/route.ts` con `business-reports/page.tsx`: tasas agregadas reales (promedio/pico/mínimo) o `null` cuando no hay datos — se eliminan los mocks 78/95/45 — commit `4cc7c24` |
