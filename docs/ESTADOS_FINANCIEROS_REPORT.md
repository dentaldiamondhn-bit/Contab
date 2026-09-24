# Reporte de Estado y Plan de Ejecución: Estados Financieros

> **Nota:** Este módulo ha sido combinado con "Registros Contables" y "Libros Legales" en un solo módulo "Contabilidad". Ver `MASTER_REPORT.md` para el estado unificado.

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables/Vistas | Almacenamiento |
|---|---|---|---|---|---|
| **Balance General** | ✅ Completo (21 Sept 2026) | 2 páginas | 1 ruta + trial-balance | 1 vista | Supabase |
| **Estado de Resultados** | Parcial | 1 página | 1 ruta | 1 vista | Supabase |
| **Flujo de Efectivo** | Parcial | 1 página | 1 ruta | 1 vista | Supabase |
| **Balanza de Comprobación** | Completo | 1 página | 2 rutas | 1 vista + 1 API | Supabase |
| **Ratios Financieros** | ✅ Completo | `app/reports/ratios/page.tsx` + API | 1 ruta | Datos reales | Cálculo automático |
| **Comparativos de Período** | ✅ Balance General (21 Sept 2026) | FinancialStatements + `BalanceSheetComparative.tsx` | trial-balance (2 rangos) | — | Datos reales |
| **Cash Flow → Comparativos Trimestrales (Q1–Q4)** | ✅ Completo (23 Sept 2026) | `app/reports/cash-flow-comparatives/page.tsx` | 1 ruta (`app/api/accounting/cash-flow-comparatives/route.ts`) | — | Datos reales (trial-balance) |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~75% (Balance General completo) | Balance de Comprobación 6 columnas funcional con RPCs; Balances de Apertura disponibles; los 3 estados financieros tienen datos reales; FinancialStatements conectado a API real |
| Cobertura de Pruebas | 0% | No existen pruebas |
| Estabilidad y Validaciones | ~55% | Validación de balance (Activos = Pasivos + Patrimonio) implementada |
| Exportación | ~80% | Balance General con Excel (.xlsx) y PDF real (21 Sept 2026); Estados y Flujo con comparativos; cash flow trimestral con Excel es-HN (23 Sept 2026); resto de estados solo CSV |
| Ratios Financieros | ~95% | 15 ratios automáticas + dashboard UI; razón corriente/prueba ácida/efectivo/capital de trabajo integrados en Balance General | Dashboard implementado |

---

## 2. Inventario Detallado

### 2.1 Balance General

**Estado: Parcial (~65%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/financials/BalanceSheet.tsx` | Balance General: carga datos de vista Supabase `balance_general`, agrupación por ACTIVO CORRIENTE/NO CORRIENTE/PASIVO/PATRIMONIO, tarjetas resumen, exportación CSV, validación de balance |
| `app/companies/[id]/accounting/financial-statements/balance-general/page.tsx` | Página moderna de Balance General por empresa: filtros de fecha/moneda, % del activo, validación, **ratios de liquidez integrados**, **exportación Excel y PDF**, **comparativo de períodos** (21 Sept 2026) |
| `components/financials/BalanceSheetComparative.tsx` | **NUEVO (21 Sept 2026)**: componente independiente de comparativos de período (mes anterior / mismo mes año anterior) con variaciones absolutas y porcentuales |
| `lib/reports/balance-general.ts` | **NUEVO (21 Sept 2026)**: utilidades puras — clasificación por código, transformación desde balanza, agrupación por secciones y cálculo de ratios de liquidez |
| `app/reports/balance-general/page.tsx` | Página de Balance General |
| `app/api/reports/balance-general/route.ts` | API de datos de Balance General |

#### Vista de Supabase

- `balance_general` — Todas las cuentas con cálculos de saldo por naturaleza (DEBIT/CREDIT)

#### Lo que Falta

- ~~Sin comparativos de período en componente independiente~~ ✅ Implementado (21 Sept 2026): `components/financials/BalanceSheetComparative.tsx`
- ~~Sin exportación Excel/PDF~~ ✅ Implementado (21 Sept 2026): Excel (.xlsx) + PDF en `app/companies/[id]/accounting/financial-statements/balance-general/page.tsx`
- ~~Sin ratios de liquidez integrados~~ ✅ Implementado (21 Sept 2026): razón corriente, prueba ácida, razón de efectivo y capital de trabajo integradas en la página

---

### 2.2 Estado de Resultados

**Estado: Parcial (~60%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/financials/IncomeStatement.tsx` | Estado de Resultados: carga de vista `estado_resultados`, muestra Ingresos/Gastos, calcula Utilidad Neta y Margen de Utilidad, análisis de rentabilidad, CSV export |
| `app/reports/estado-resultados/page.tsx` | Página de Estado de Resultados |
| `app/api/reports/estado-resultados/route.ts` | API de datos |
| `app/api/reports/pnl/route.ts` | API de P&L |

#### Vista de Supabase

- `estado_resultados` — Cuentas de ingreso y gasto filtradas desde balance_general

#### Lo que Falta

- ~~Sin comparativos de período~~ ✅ Implementado (22 Sept 2026): `components/financials/IncomeStatementComparative.tsx` + página integra comparativo opcional (mes anterior / mismo mes, año anterior) con variaciones y tendencias
- ~~Sin análisis de márgenes por categoría~~ ✅ Implementado (22 Sept 2026): tarjeta "Análisis de Márgenes por Categoría" (margen bruto, operativo, neto, costos/gastos sobre ventas) + detalle por categoría 2 dígitos
- ~~Sin proyecciones~~ ✅ Implementado (22 Sept 2026): tarjeta "Proyecciones" (mensual/trimestral/anual por run-rate, punto de equilibrio) — `computeProjections` en `lib/reports/income-statement.ts`

---

### 2.3 Flujo de Efectivo

**Estado: Completado (22 Sept 2026)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/reports/cash-flow.ts` | Utilidades compartidas: clasificación por actividad (Operación/Inversión/Financiamiento), transformación para comparativos, agrupación por rubro, análisis de fuentes/usos, proyecciones de caja y runway (run-rate mensual/trimestral/anual, puntos de equilibrio de efectivo) |
| `components/financials/CashFlowComparative.tsx` | Comparativos de período independientes (mes anterior / mismo mes año anterior) con variaciones y análisis de fuentes/usos + proyecciones |
| `app/companies/[id]/accounting/financial-statements/flujo-efectivo/page.tsx` | Página de Flujo de Efectivo integrada: comparativos de período alternables, análisis de fuentes/usos, proyección de caja (run-rate con saldo proyectado y meses de runway) |
| `components/financials/CashFlowStatement.tsx` | Flujo de Efectivo heredado: analiza vista `libro_diario` |
| `app/reports/flujo-efectivo/page.tsx` | Página regulatoria de Flujo de Efectivo |
| `app/api/reports/flujo-efectivo/route.ts` | API de datos |

#### Vista de Supabase

- `flujo_efectivo_mensual` — Ingresos vs egresos mensuales por tipo de comprobante

#### Items Resueltos (22 Sept 2026)

- ~~Sin comparativos de período~~ → Implementado: `CashFlowComparative.tsx` (mes anterior / mismo mes, año anterior) con variaciones
- ~~Sin análisis de fuentes/usos~~ → Implementado: análisis de fuentes/usos por actividad en página y comparativo
- ~~Sin flujo de efectivo proyectado~~ → Implementado: proyecciones por run-rate (mensual/trimestral/anual) con saldo proyectado y meses de runway en `lib/reports/cash-flow.ts`

### 2.3.1 Comparativos trimestrales automáticos de Flujo de Caja (Q1–Q4) — Completo (23 Sept 2026)

Segmentación trimestral automática desde los movimientos reales del trial-balance, flujo por trimestre reutilizando la clasificación de cash-flow, matriz comparativa Q1⇄Q4, mejor/peor trimestre y exportación a Excel.

| Archivo | Propósito |
|---|---|
| `lib/reports/cash-flow-comparatives.ts` | `splitTrialsIntoQuarters` (Q1 01-01→03-31, Q2 04-01→06-30, Q3 07-01→09-30, Q4 10-01→12-31 según la fecha real de cada movimiento), `buildCashFlowComparatives` (reutiliza `transformToFlujoEfectivo` + `groupFlujoItems` de `cash-flow.ts` por trimestre — sin duplicar la clasificación —, saldo inicial encadenado al cierre del trimestre anterior, totales y mejor/peor trimestre por flujo neto), formato Excel `['Concepto','Q1','Q2','Q3','Q4','Total','Δ Q4−Q1']` y exportación `FlujoCaja_ComparativoQ1Q4_{año}_{empresa}.xlsx` |
| `app/api/accounting/cash-flow-comparatives/route.ts` | GET (tenantId + fiscalYear → segmentación Q1–Q4 real + totales + mejor/peor trimestre) y POST (descarga del Excel real). Fix `89fad97`: clave de la sección de financiamiento corregida para que Flujo Neto de Financiamiento/totales se calculen sobre datos reales |
| `app/reports/cash-flow-comparatives/page.tsx` | Selector de año fiscal (default año actual), matriz comparativa Q1⇄Q4, badges "Mejor trimestre"/"Peor trimestre" y botón "Exportar a Excel (.xlsx)" con estados es-HN |

Capacidades: segmentación por trimestre del año fiscal de HN sobre la fecha real del movimiento (`Transaction.date`); clasificación de actividad de flujo de caja reutilizada de `lib/reports/cash-flow.ts`; apertura Q1 = saldo inicial del flujo, apertura Qn = cierre de Q(n-1), cierre = apertura + flujo neto.

---

### 2.4 FinancialStatements (Componente Combinado)

**Estado: Parcial (~50%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/accounting/FinancialStatements.tsx` | Pestañas combinadas (Balance, Resultados, Flujo), comparativos de período, análisis de varianza, botones PDF. **Conectado a API real** — carga cuentas de `/api/accounting/accounts`, calcula totales por tipo. |
| `components/financial/CashFlowManager.tsx` | Gestor de flujos de efectivo |

#### Lo que Falta

- **Pestaña de Flujo muestra "En Desarrollo"**
- Sin generación real de PDF

---

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | ~~FinancialStatements usa mock data~~ | ~~Componente principal inutilizable~~ | ~~Crítica~~ | ✅ Resuelta |
| 2 | Flujo de Efectivo usa clasificación simplificada | Cálculos inexactos | Alta |
| 3 | Sin exportación Excel/PDF real | Limitación para uso en producción | Alta | ✅ Balance General: Excel + PDF (21 Sept 2026); resto de estados pendiente |
| 4 | Sin dashboard de ratios financieros | Sin análisis financiero profundo | Media | ✅ Resuelto - Dashboard en `app/reports/ratios/page.tsx` |
| 5 | Sin comparativos de período reales | Sin tendencias | Media | ✅ Balance General: `BalanceSheetComparative.tsx` (21 Sept 2026) |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Conexión de Datos y Correcciones

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 1.1 | Conectar FinancialStatements a datos reales de Supabase | `FinancialStatements.tsx` | Componente funcional |
| 1.2 | Implementar pestaña de Flujo de Efectivo | `FinancialStatements.tsx` | Flujo funcional |
| 1.3 | Corregir clasificación de Flujo de Efectivo | `CashFlowStatement.tsx` | Clasificación precisa |

### Etapa 2: Exportación y Reportes

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 2.1 | Implementar exportación Excel para estados financieros | `lib/services/excel-export.ts` | Exportación .xlsx |
| 2.2 | Implementar generación de PDF profesional | `lib/services/pdf-export.ts` | PDFs con formato |
| 2.3 | Crear plantillas de impresión para cada estado | `templates/` | Plantillas HTML |

### Etapa 3: Ratios y Análisis

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 3.1 | Crear servicio de cálculo de ratios financieros | `lib/services/financial-ratios.ts` | 15+ ratios |
| 3.2 | Dashboard de ratios financieros | `app/reports/ratios/page.tsx` | Dashboard visual ✅ |
| 3.3 | Análisis de tendencias multi-período | `lib/services/trend-analysis.ts` | Análisis de tendencias |

### Etapa 4: Comparativos y Proyecciones

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 4.1 | Comparativos de período (año vs año) | `components/financials/` | Comparativos |
| 4.2 | Proyecciones de resultados | `lib/services/projections.ts` | Proyecciones |
| 4.3 | Presupuesto vs real | `app/reports/budget-vs-actual/page.tsx` | Reporte |

### Etapa 5: QA

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 5.1 | Pruebas de cálculos financieros | `__tests__/financials/` | Pruebas unitarias |
| 5.2 | Pruebas E2E de reportes | `__tests__/e2e/reports/` | Pruebas E2E |

---

## 5. Diagrama de Dependencias

```
Etapa 1 (Conexión de Datos)
    ├── Etapa 2 (Exportación)
    ├── Etapa 3 (Ratios y Análisis)
    └── Etapa 4 (Comparativos y Proyecciones)
            └── Etapa 5 (QA)
```

---

## 6. Estimación de Esfuerzo

| Etapa | Tareas | Complejidad | Estimación |
|---|---|---|---|
| Etapa 1: Conexión | 3 tareas | Alta | 1-2 semanas | ✅ 2/3 completas |
| Etapa 2: Exportación | 3 tareas | Media | 2-3 semanas |
| Etapa 3: Ratios | 3 tareas | Media | 2-3 semanas |
| Etapa 4: Comparativos | 3 tareas | Alta | 2-3 semanas |
| Etapa 5: QA | 2 tareas | Media | 1 semana |
| **Total** | **14 tareas** | — | **8-12 semanas** |

---

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 16.3.5 | Restaurado desde 15.5.25; build y dev OK en Vercel (16 Sept 2026) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |

## Actualizaciones de Estados Financieros (16 Sept 2026)

| Cambio | Detalle |
|---|---|
| Asientos AJUSTE de Notas de Crédito/Débito | NC/ND generan asientos AJUSTE en `/api/accounting/transactions` (4101 Ingresos, 2105 ISV por pagar, contra 1101 Caja / 1103 Clientes; ISV 15% incluido). Impactan el Estado de Resultados (4101) y el Balance General (1101/1103/2105) |
| Fix API de empresas | `app/api/companies/route.ts` corregido: `SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL` (elimina el HTTP 500) |

## Actualizaciones de Estados Financieros (21 Sept 2026)

| Cambio | Detalle |
|---|---|
| Comparativos de período (Balance General) | Nuevo componente independiente `components/financials/BalanceSheetComparative.tsx`: compara período actual vs mes anterior o mismo mes del año anterior, mostrando variación absoluta y porcentual por cuenta y por sección (datos reales de `trial-balance`) |
| Exportación Excel | Botón "Excel" en la página de Balance General genera `.xlsx` con estructura completa (encabezado, secciones con totales, verificación y ratios de liquidez) vía `xlsx` |
| Exportación PDF | PDF real (jsPDF + html2canvas) ya disponible e incluye el comparativo cuando está activado |
| Ratios de liquidez integrados | Tarjeta "Ratios de Liquidez" en el Balance General: razón corriente, prueba ácida (sin inventario 13xx), razón de efectivo (11xx) y capital de trabajo, con semáforo de salud |
| Utilidades compartidas | `lib/reports/balance-general.ts`: clasificación por código (1/11-13/2/21-23/3), transformación de balanza y agrupación reutilizadas por página y componente |

## Actualizaciones de Estados Financieros (23 Sept 2026)

| Cambio | Detalle |
|---|---|
| Cash flow → comparativos trimestrales automáticos (Q1–Q4) | `lib/reports/cash-flow-comparatives.ts` (segmentación Q1–Q4 desde la fecha real de cada movimiento del trial-balance, flujo por trimestre reutilizando la clasificación de `cash-flow.ts`, saldos encadenados, mejor/peor trimestre, formato Excel es-HN `['Concepto','Q1','Q2','Q3','Q4','Total','Δ Q4−Q1']`) + `app/api/accounting/cash-flow-comparatives/route.ts` (GET comparativo real por trimestre / POST descarga real del .xlsx `FlujoCaja_ComparativoQ1Q4_{año}_{empresa}.xlsx`) + página `app/reports/cash-flow-comparatives/page.tsx` (selector de año fiscal, matriz comparativa, badges y exportación) — commit `a9ce620` |
| Fix sección de financiamiento | `89fad97`: correcta clave de la sección neta de financiamiento para que Flujo Neto de Financiamiento y totales se computen de datos reales (no de claves inexistentes) |
