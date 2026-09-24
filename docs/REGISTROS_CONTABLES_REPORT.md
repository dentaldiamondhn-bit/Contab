# Reporte de Estado y Plan de Ejecución: Registros Contables

> **Nota:** Este módulo ha sido combinado con "Estados Financieros" y "Libros Legales" en un solo módulo "Contabilidad". Ver `MASTER_REPORT.md` para el estado unificado.

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Catálogo de Cuentas** | Completo | 1 página | 4 rutas | 3 tablas | Supabase + Prisma |
| **Asientos Contables (Pólizas)** | Completo | 1 página | 1 ruta (GET/PUT/POST) | 2 tablas | Supabase (`journal-service.ts`, sin Prisma) |
| **Tipos de Comprobante** | Completo | En AccountingBooks | 1 ruta | — | Lógica en código |
| **Libros Contables** | Completo | 1 página | 2 rutas + 3 RPCs | 5 vistas | Supabase |
| **Cierre de Período** | Completo (Etapa 3.1) | 1 página + tab | 1 ruta (GET/POST/PATCH) | `period_locks` | Supabase |
| **Balances de Apertura** | Completo (Etapa 3.2) | 1 página | 2 rutas (GET/PUT + POST auto) | 2 columnas en `chart_of_accounts` | Supabase |
| **Auditoría** | Completo | `/accounting/audit` | 2 rutas | 1 tabla (`account_audit_log`) | Supabase |
| **Plantillas de Asientos** | Completo | `/accounting/journal-templates` | 1 ruta (CRUD) | 2 tablas | Supabase |
| **Reversión de Asientos** | Completo | `/accounting/reversals` | 1 ruta (GET/POST/PUT) | 1 tabla | Supabase |
| **Asientos Recurrentes** | Completo | `/accounting/recurring-entries` | 2 rutas (CRUD + execute) | 2 tablas | Supabase |
| **Validación de Catálogo** | Completo | `/accounting/validate-catalog` | 1 ruta | — | Cálculos en código |
| **Asiento automático de retención** | Completo (23 Sept 2026) | `components/WithholdingManager.tsx` (toggle persistido `withholding_auto_entry:{tenant}`) | 1 ruta (`app/api/accounting/withholding-journal/route.ts`) | `Withholding` | Supabase |
| **Libro Mayor y Libro Diario automáticos** | Completo (23 Sept 2026) | `app/companies/[id]/reports/general-ledger/page.tsx` | 2 rutas (`trial-balance` agregado + `trial-balance-detailed`) | — | Supabase |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~95% | Catálogo completo con secciones colapsables y cascada; libros via RPCs; balances de apertura; Balance de Comprobación 6 columnas con RPCs; auditoría inmutable (apertura + pólizas por línea); plantillas con importación Excel; reversiones con trazabilidad; asientos recurrentes; FinancialStatements conectado a API real |
| Cobertura de Pruebas | ~85% | 35+ tests `node:test` (pólizas + auditoría por línea, cierre mensual, apertura automática, variaciones período, transacciones, balances de apertura) + **tests E2E** (flujo de asientos, validaciones, candado de período, variaciones entre períodos); cobertura completa de flujos críticos; validaciones adicionadas: montos > 0, cuentas repetidas, tipos de cuenta, fechas inválidas, period locking edge cases |
| Estabilidad y Validaciones | ~80% | Validación de doble entrada; middleware de períodos; validación de catálogo (9 checks); fix tenantId en trial balance |
| Persistencia de Datos | ~95% | Supabase vía `service_role` (POST de pólizas migrado fuera de Prisma); hook sin mock data; FinancialStatements conectado a API real |
| Integración entre Módulos | ~75% | Integración con inventario y facturación; variaciones entre períodos implementadas; apertura automática funcional; tests E2E validando integración completa |
| Documentación y Tipado | ~80% | `types/accounting.ts` centralizado; `journal-service.ts` migrado a tipos estrictos; FinancialStatements conectado a API real |

---

## 2. Inventario Detallado por Sub-Área

### 2.1 Catálogo de Cuentas

**Estado: Completo (~95%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/accounting/ChartOfAccountsManager.tsx` | Gestor completo: **secciones colapsables por tipo** (Activo, Pasivo, Patrimonio, Ingresos, Gastos), CRUD, importación/exportación CSV, 3 plantillas (PYME 37, Comercial 53, Servicios 28), búsqueda/filtrado, auto-asignación de naturaleza, multi-divisa, código fiscal. **Code-inference hierarchy** (reemplaza parentId-based). Expandir/Colapsar todo. |
| `app/accounting/accounts/page.tsx` | Página de gestión del catálogo |
| `app/companies/[id]/accounting/page.tsx` | Dashboard de contabilidad con tab de cuentas que usa **secciones colapsables por tipo** (no flat list) |
| `app/api/accounting/accounts/route.ts` | API CRUD completa para cuentas: GET (fallback chain: tenantId → tenant_id → global), POST (insert con `crypto.randomUUID()`), PUT (con cascada a `journal_entry_template_lines` y `recurring_entries` JSONB + audit log), DELETE. Sub-rutas `check-transactions` y `delete-all` |
| `lib/accounting-utils.ts` | Utilidades contables: etiquetas/colores, validación doble entrada, cálculo de saldos, formato moneda centavos HNL, balanza de comprobación |

#### Archivos de Validación de Catálogo

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/accounting/validate-catalog/page.tsx` | UI de validación: 4 cards de resumen (Total, Errores, Advertencias, Estado), lista expandible de problemas con severidad, tabla de cuentas afectadas, botón "Solucionar" por problema, exportación a Excel (XLSX) y PDF (jsPDF) |
| `app/api/accounting/accounts/validate/route.ts` | API GET que verifica 9 tipos de problemas: códigos duplicados, pads huérfanos, sin código, sin nombre, separadores inconsistentes (`.` vs `-`), cuentas desactivadas, tipo no válido, autorreferencia, nombre = código |

#### Archivos de Balances de Apertura

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/accounting/opening-balances/page.tsx` | UI de balances de apertura: tabla agrupada por tipo, "Calcular desde Movimientos" con matching flexible, input de saldo, date picker, filtros, cards de resumen |
| `app/api/accounting/opening-balances/route.ts` | API GET (chart_of_accounts → Account fallback → global fallback) y PUT (actualiza saldos + escribe `account_audit_log`) |
| `supabase/ADD_OPENING_BALANCE.sql` | Migración SQL: agrega columnas `opening_balance` (BIGINT) y `opening_balance_date` (DATE) a `chart_of_accounts` + funciones RPC |

#### Tablas de Base de Datos

- `chart_of_accounts` (Supabase) — id, company_id, code, name, type, nature, level, is_selectable, parent_id, currency, fiscal_code, balance, **opening_balance** (BIGINT), **opening_balance_date** (DATE), tenant_id
- `Account` (Prisma) — id, tenantId, name, code, type, description, parentId, isActive
- `account_audit_log` (Supabase) — Registro de auditoría a nivel de cuenta con JSONB old/new values

#### Lo que Falta

| # | Pendiente | Módulo | Impacto | Prioridad |
|---|---|---|---|---|
| ok | Dashboard de ratios financieros implementado | Contabilidad | Análisis financiero profundo | Media |
| ok | Comparatives año-a-año implementados | Contabilidad | Tendencias multi-período | Media |
| ok | Integración inventario-COGS automático | Contabilidad | Costo de ventas automático | Alta |
| ok | Testing unitario para servicios críticos completado | Contabilidad | Cobertura de pruebas | Alta |
| ok | Integrar botones de exportación en UI contable completado | Contabilidad | Exportar Balanza, Pólizas, Impuestos a Excel/PDF | Alta |
| ok | Exportación logs auditoría PDF/Excel completado | Contabilidad | Exportar logs a PDF/Excel con filtros | Alta |

---

### 2.2 Asientos Contables

**Estado: Completo (~95%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/accounting/JournalEntryForm.tsx` | Formulario de asientos con tipo de comprobante, entrada múltiple débito/crédito, validación en tiempo real. **Conectado a API real** — carga cuentas de `/api/accounting/accounts` con tenant (`x-tenant-id` + `?tenantId=`, recarga al cambiar empresa, aviso si falta tenant), guarda vía `POST /api/accounting/transactions` (servicio `lib/services/journal-service.ts` con `service_role`: validación de balance, cuentas del tenant, consecutivo por tenant+tipo, 201 con N° de póliza). Selector de cuentas con búsqueda por código/nombre. |
| `components/accounting/FinancialStatements.tsx` | Estados financieros (Balance General, Estado de Resultados). **Conectado a API real** — carga cuentas de `/api/accounting/accounts`, calcula totales por tipo. |
| `components/accounting/MultiTenantAccountingManager.tsx` | Gestión multi-tenant. **Conectado a API real** — carga empresas de `/api/admin/tenants`. |
| `hooks/use-accounts.ts` | Hook que carga cuentas reales de `/api/accounting/accounts` (sin datos mock). |
| `app/companies/[id]/accounting/voucher-form/page.tsx` | Formulario de póliza completo con selector de plantillas, duplicar, anular |
| `app/api/accounting/transactions/route.ts` | API CRUD de transacciones (GET/POST/PUT) |
| `app/api/accounting/voucher-number/route.ts` | Generación automática de números de comprobante |
| `lib/voucher-types.ts` | Tipos de comprobante (INGRESO, EGRESO, DIARIO, AJUSTE), numeración automática |
| `lib/voucher-categorization.ts` | Detección automática del tipo de comprobante |

#### Archivos de Plantillas de Asientos

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/accounting/journal-templates/page.tsx` | UI de gestión de plantillas: lista con preview de líneas, formulario crear/editar, duplicar, eliminar. Selector de cuentas con búsqueda. **Importación masiva desde Excel** con vista previa, detección de duplicados, y descarga de plantilla de ejemplo. |
| `app/api/accounting/journal-templates/route.ts` | API CRUD (GET/POST/PUT/DELETE) para plantillas y sus líneas |
| `supabase/JOURNAL_ENTRY_TEMPLATES.sql` | Migración SQL idempotente: tablas `journal_entry_templates` y `journal_entry_template_lines` con RLS (safe to run multiple times) |

#### Archivos de Reversión de Asientos

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/accounting/reversals/page.tsx` | UI de reversiones: historial de reversiones, dialog de nueva reversión con búsqueda de transacciones, upload de Excel para reversiones masivas, dropdown de usuarios (via `/api/accounting/users`). |
| `app/api/accounting/reversals/route.ts` | API GET/POST/PUT: crea transacción con signos invertidos + JournalEntry invertidos. Registra en `journal_entry_reversals` con trazabilidad completa. Transaction insert incluye todos los campos requeridos (`id`, `voucherNumber`, `tenantId`, `voucherType`, `description`, `date`, `currency`, `exchangeRate`, `totalAmount`, `originalTotal`, `createdAt`, `updatedAt`). JournalEntry insert incluye `id` explícito. |
| `supabase/REVERSAL_AND_RECURRING.sql` | Migración SQL: tablas `journal_entry_reversals`, `recurring_entries`, `recurring_entry_executions` con RLS |

#### Archivos de Asientos Recurrentes

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/accounting/recurring-entries/page.tsx` | UI de CRUD: crear/editar/eliminar/ejecutar asientos recurrentes. Selector de cuentas con `account_id` almacenado. Frecuencias: semanal, quincenal, mensual, trimestral, anual. Vista previa de líneas. |
| `app/api/accounting/recurring-entries/route.ts` | API GET/POST/PUT/DELETE para asientos recurrentes |
| `app/api/accounting/recurring-entries/execute/route.ts` | POST: ejecuta asiento recurrente. Genera `id` UUID, `voucherNumber` auto-calculado, `createdAt`/`updatedAt`. Resuelve `account_code` → Account UUID via lookup. Calcula `totalAmount` de líneas en centavos. |

#### Archivos de Usuarios para Reversión

| Archivo | Propósito |
|---|---|
| `app/api/accounting/users/route.ts` | GET: lista de usuarios del tenant con service role (bypasses Clerk auth). Tabla `User` con columnas lowercase (`tenantid`, `firstname`, `lastname`, `isactive`). |

#### Tablas de Base de Datos

- `Transaction` (Prisma) — Encabezado: id, tenantId, date, description, reference, voucherType, voucherNumber, currency, exchangeRate, totalAmount
- `JournalEntry` (Prisma) — Líneas: id, transactionId, accountId, amount (BigInt), originalAmount, currency, exchangeRate
- `journal_entry_templates` (Supabase) — id, tenant_id, name, description, voucher_type, is_active, created_at, updated_at
- `journal_entry_template_lines` (Supabase) — id, template_id (FK), account_code, account_name, debit_enabled, credit_enabled, default_amount, sort_order
- `journal_entry_reversals` (Supabase) — id, tenant_id, original_transaction_id, reversal_transaction_id, reason, reversed_by, reversed_at, status, notes, created_at
- `recurring_entries` (Supabase) — id, tenant_id, name, description, voucher_type, frequency, next_execution, last_execution, is_active, entries (JSONB), created_at, updated_at
- `recurring_entry_executions` (Supabase) — id, recurring_entry_id (FK), transaction_id, executed_at, status, error_message, created_at

#### Notas de Crédito/Débito → Asiento AJUSTE (16 Sept 2026)

El módulo de Notas de Crédito/Débito genera asientos automáticos de tipo **AJUSTE** (best-effort) contra `/api/accounting/transactions`. ISV 15% incluido: `subTotal = monto / 1.15`, `impuesto = monto - subTotal`. Cuentas: 4101 Ingresos, 2105 ISV por pagar, contra-cuenta 1101 Caja (efectivo) o 1103 Clientes (crédito). **NC:** +sub(4101), +tax(2105), −total(contra). **ND:** +total(contra), −sub(4101), −tax(2105). El asiento es balanceado (suma 0); los errores se registran y NO bloquean la emisión de la nota (ver `docs/NOTAS_CREDITO_DEBITO_REPORT.md`).

#### Lo que Falta

_(Ninguna — asientos contables completos)_

---

### 2.3 Libros Contables

**Estado: Completo (~85%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/accounting/AccountingBooks.tsx` | Visor integral con 8 pestañas: Diario, Mayor, Balance, Ingresos, Egresos, Partidas, Balance General, SAR 221 |
| `lib/reports/trial-balance.ts` | Balanza de comprobación server-side con saldos de apertura/período/final |
| `app/api/accounting/integrated-books/route.ts` | API de libros integrados |
| `app/api/accounting/trial-balance/route.ts` | API de balanza de comprobación |

#### Vistas de Supabase

- `balance_general`, `balanza_comprobacion`, `libro_diario`, `libro_mayor`, `resumen_contable`

---

### 2.4 Cierre de Período (unificado — Wizard Único)

**Estado: Completo (~95%) — unificado en §2.6 / Wizard**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/accounting/ClosingWizard.tsx` | **Wizard de Cierre Único**: tabs Mensual (grid 12 meses) + Anual (ejercicio), mismo candado `period_locks` (mensual `1-12`, anual `0`), validación anual exige 12 meses cerrados |
| `lib/services/period-lock.ts` | Candado unificado `assertPeriodOpen` (mensual) + `assertYearOpen` + `assertPeriodOpenUnified` (anual bloquea todo el año) — reutilizado por `journal-service` y middleware |
| `lib/period-lock-middleware.ts` | Middleware Prisma **reutilizado** para mensual + anual (delega a `assertPeriodOpenUnified` vía `period_locks`; fallback `GlobalSettings.lastClosedDate` legacy) |
| `lib/services/period-closing.ts` | Reglas puras `isValidYearMonth` (incluye `0` anual), `isAnnualPeriod`, `assertCloseAllowed` (anual omite previo) |
| `supabase/PERIOD_LOCKS.sql` | CHECK `month 0-12` (antes `1-12`) — anual usa `month=0` |
| `components/YearEndClosing.tsx` | Wizard anual legacy (mantenido por compatibilidad) |
| `app/closing/page.tsx` | Ahora renderiza `ClosingWizard` (antes `YearEndClosing`); endpoint `/api/closing/*` delegan al candado unificado |
| `app/companies/[id]/accounting/closing/page.tsx` | Ahora `ClosingWizard` unificado (antes 646 líneas mensuales); legacy guardado como `page.monthly-legacy.tsx` |
| `app/api/accounting/period-closing/route.ts` | **Endpoint único** `GET/POST/PATCH` (mensual `1-12` + anual `0`): mensual valida secuencia, anual valida 12 meses cerrados |
| `app/api/closing/perform` + `trial-balance` | **Compatibilidad**: marcados `@deprecated`, anual también escribe `period_locks(month=0)` |

#### Lo que Falta

- _(Ninguna — mensual + anual unificados, sin endpoints duplicados)_

---

### 2.5 Auditoría Contable

**Estado: Completo (~95%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/accounting/audit/page.tsx` | UI de historial de auditoría: logs agrupados por día, expand/collapse por día, columnas de Hora, Cuenta (código + nombre), Acción, Saldo Anterior/Nuevo, Usuario. Valores formateados (no JSON crudo). |
| `app/api/accounting/audit-logs/route.ts` | API GET con paginación, filtros por acción/código/fecha. Enriquece datos con nombre de cuenta desde tabla Account. Service role bypass RLS. |
| `app/api/accounting/opening-balances/route.ts` | PUT escribe a `account_audit_log` al actualizar saldos de apertura (old_values/new_values JSONB). |
| `lib/audit-middleware.ts` | Extensión Prisma para auditoría automática en Transaction y JournalEntry |
| `lib/audit-context.ts` | Configuración de contexto de auditoría desde NextRequest |
| `lib/services/audit-service.ts` | CRUD de auditoría con paginación |
| `components/dashboard/AuditFeed.tsx` | Feed de auditoría en tiempo real con auto-refresh (30s) |
| `app/api/audit-logs/route.ts` | API global de logs de auditoría (Prisma) |

#### Tabla de Base de Datos

- `account_audit_log` (Supabase) — PK `id`, `tenant_id`, `account_id`, `account_code`, `action`, `old_values` (JSONB), `new_values` (JSONB), `performed_by`, `performed_at`. RLS habilitado, service_role tiene acceso completo. Backfill automático de `account_code` desde tabla `Account`.

#### Flujo de Auditoría

1. **Saldos de apertura** → `PUT /api/accounting/opening-balances` escribe `account_audit_log` (`OPENING_BALANCE_UPDATE` / `OPENING_BALANCE_AUTO`) + `period-closing` (`PERIOD_CLOSED` / `PERIOD_REOPENED`)
2. **Pólizas** → `POST /api/accounting/transactions` (`lib/services/journal-service.ts`) crea `Transaction` + `JournalEntry` vía `service_role` y registra **una fila por línea en `account_audit_log`** (`JOURNAL_CREATE`: `account_id`/`account_code`, `old_values=null`, `new_values={transactionId, voucherType, voucherNumber, date, amount, currency, description}`, `performed_by` desde `x-user-id`/`x-user-email`)
3. UI de auditoría carga logs → `GET /api/accounting/audit-logs` (soporta filtro múltiple `action=JOURNAL_CREATE,OPENING_BALANCE_UPDATE`, paginado, `accountCode`, `from`/`to`; enriquece con `Account.code/name`)
4. UI agrupa por día, renderiza con expand/collapse, badges por tipo y montos formateados (apertura en centavos / asiento con `voucherType-voucherNumber` + descripción)

#### Lo que Falta

- Sin exportación de logs de auditoría a PDF/Excel **(Completado - 18 Sept 2026)**
- Auditoría Prisma (`AuditLog`/`audit-middleware.ts`) quedó legacy: el camino Supabase no pasa por `DATABASE_URL`; se mantiene solo para compatibilidad (modo mantenimiento)

---

### 2.6 Cierre Mensual

**Estado: Completo (~90%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/accounting/closing/page.tsx` | UI de cierre mensual: grid de 12 meses por año, barra de progreso, badges de estado (abierto/cerrado/bloqueado), dialog de cierre con notas, dialog de reapertura con motivo obligatorio, detalle de período. |
| `app/api/accounting/period-closing/route.ts` | API GET (períodos con conteo + flags reales `prev_month_closed`/`can_close`), POST (cierra mes: no futuro, secuencia mes previo, balance, sin pendientes), PATCH (reapertura con motivo). Reglas puras en `lib/services/period-closing.ts`. |
| `supabase/PERIOD_LOCKS.sql` | Migración SQL: tabla `period_locks` + RLS + funciones `validate_month_for_closing`, `close_period`, `reopen_period` + índices. |
| `lib/services/journal-service.ts` | Candado de período: `assertPeriodOpen` rechaza asientos con fecha en mes cerrado/bloqueado (400). Cubre formulario de pólizas y asientos AJUSTE de NC/ND (vía `POST /api/accounting/transactions`). |

#### Tablas de Base de Datos

- `period_locks` (Supabase) — id, tenant_id, year, month, status (open/closed/locked), closed_by, closed_at, locked_by, locked_at, notes, trial_balance_snapshot (JSONB), created_at, updated_at. UNIQUE(tenant_id, year, month).

#### Lo que Falta

- _(Ninguna — bloqueo permanente implementado: `PUT /api/accounting/period-closing` closed→locked con auditoría `PERIOD_LOCKED`, reapertura de locked bloqueada, candado unificado lo respeta)_

---

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | ~~JournalEntryForm usa mockAccounts y handleSubmit no guarda~~ | ~~Funcionalidad principal rota~~ | ~~Crítica~~ | ✅ Resuelta |
| 2 | ~~use-accounts.ts retorna datos mock~~ | ~~Hook inútil en producción~~ | ~~Crítica~~ | ✅ Resuelta |
| 3 | ~~Sin tipos TypeScript para entidades contables~~ | ~~Errores en runtime~~ | ✅ Resuelta (17 Sept 2026: `types/accounting.ts`) |
| 6 | ~~Auditoría solo cubre saldos de apertura (no transacciones ni JournalEntry en `account_audit_log`)~~ | ~~Auditoría incompleta~~ | ✅ Resuelta (17 Sept 2026: `JOURNAL_CREATE` por línea + `account_audit_log` Supabase) |
| 4 | ~~Sin cierre mensual automatizado~~ | ~~Riesgo de error humano~~ | ~~Media~~ | ✅ Resuelta |
| 5 | ~~Sin reversión de asientos contables~~ | ~~Correcciones manuales~~ | ~~Media~~ | ✅ Resuelta |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Conexión del Formulario de Asientos a API

| # | Tarea | Archivos | Dependencias | Entregable |
|---|---|---|---|---|
| 1.1 | ✅ Conectar JournalEntryForm a API real (tenant en carga de cuentas) | `JournalEntryForm.tsx` (17 Sept 2026) | Ninguna | Formulario funcional |
| 1.2 | ✅ Implementar guardado real en handleSubmit (vía Supabase, sin Prisma) | `POST /api/accounting/transactions` + `lib/services/journal-service.ts` (17 Sept 2026) | 1.1 | Asientos guardados en BD |
| 1.3 | ✅ Crear tipos TypeScript para entidades contables | `types/accounting.ts` (17 Sept 2026: `AccountType`, `VoucherType`, `PeriodStatus`, `Account`/`Transaction`/`JournalEntry`/`ChartOfAccountsRow`/`PeriodLock`/`AccountAuditLog` + guards) | Ninguna | Archivo de tipos |

### Etapa 2: Plantillas y Asientos Recurrentes

| # | Tarea | Archivos | Dependencias | Entregable |
|---|---|---|---|---|
| ~~2.1~~ | ~~Crear sistema de plantillas de asientos~~ | ~~`lib/services/journal-templates.ts`~~ | ~~Etapa 1~~ | ✅ Completada — API `/api/accounting/journal-templates` + UI `/accounting/journal-templates` + selector en formulario de póliza + importación Excel + detección de duplicados |
| ~~2.2~~ | ~~Implementar importación masiva de asientos~~ | ~~`lib/services/excel-import.ts`~~ | ~~Etapa 1~~ | ✅ Completada — Importación masiva de plantillas desde Excel con vista previa, detección de duplicados y descarga de plantilla de ejemplo |
| ~~2.3~~ | ~~Implementar asientos de reversión~~ | ~~`lib/services/journal-reversal.ts`~~ | ~~Etapa 1~~ | ✅ Completada — API `/api/accounting/reversals` + UI `/accounting/reversals` con trazabilidad completa (transacción original → reversión) |

### Etapa 3: Cierre Mensual y Períodos

| # | Tarea | Archivos | Dependencias | Entregable |
|---|---|---|---|---|
| 3.1 | ✅ Automatizar cierre mensual (candado + secuencia + futuro) | `lib/services/period-closing.ts` + candado en `journal-service.ts` + flags reales en API/UI (17 Sept 2026) | Etapa 1 | Cierre automático |
| 3.2 | ✅ Generar balance de apertura automático | `lib/services/opening-balance.ts` + `POST .../opening-balances/auto` + UI en página de apertura (17 Sept 2026) | 3.1 | Balance de apertura |
| 3.3 | ✅ Reporte de variaciones entre períodos | `app/reports/period-variations/page.tsx` + `GET /api/accounting/period-variations` + `lib/services/period-variations.ts` (17 Sept 2026) | 3.1 | Reporte de variaciones |

### Etapa 4: Validación y Auditoría

| # | Tarea | Archivos | Dependencias | Entregable |
|---|---|---|---|---|
| ~~4.1~~ | ~~Validación de integridad del catálogo~~ | ~~`lib/services/account-validation.ts`~~ | ~~Etapa 1~~ | ✅ Completada — API `/api/accounting/accounts/validate` + UI `/accounting/validate-catalog` con 9 checks |
| ~~4.2~~ | ~~Auditoría extendida (todos los modelos contables)~~ | ~~`lib/audit-middleware.ts`~~ | ~~Etapa 1~~ | ✅ Completada |
| ~~4.3~~ | ~~Dashboard de auditoría contable~~ | ~~`app/accounting/audit/page.tsx`~~ | ~~4.2~~ | ✅ Completada — UI agrupada por día, expand/collapse, valores formateados |

### Etapa 5: QA y Documentación

| # | Tarea | Archivos | Dependencias | Entregable |
|---|---|---|---|---|
| 5.1 | Pruebas unitarias para utilidades contables | `__tests__/accounting/` | Todas | Suite de pruebas |
| 5.2 | Pruebas E2E para flujo de asientos | `__tests__/e2e/accounting/` | Todas | Pruebas E2E |
| 5.3 | Documentación de API contable | `docs/ACCOUNTING_API.md` | Todas | Documentación |

---

## 5. Diagrama de Dependencias

```
Etapa 1 (Conexión API)
    ├── Etapa 2 (Plantillas + Importación)
    ├── Etapa 3 (Cierre Mensual)
    └── Etapa 4 (Validación + Auditoría)
            └── Etapa 5 (QA + Documentación)
```

---

## 6. Estimación de Esfuerzo

| Etapa | Tareas | Complejidad | Estimación |
|---|---|---|---|
| Etapa 1: Conexión API | 3 tareas | Alta | 1-2 semanas |
| Etapa 2: Plantillas | 3 tareas | Media | 1-2 semanas |
| Etapa 3: Cierre Mensual | 3 tareas | Alta | ✅ Completada (17 Sept 2026: 3.1 candado, 3.2 apertura auto, 3.3 variaciones) |
| Etapa 4: Validación | 3 tareas | Media | 1-2 semanas |
| Etapa 5: QA | 3 tareas | Media | 1-2 semanas |
| **Total** | **15 tareas** | — | **4-7 semanas** |

---

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 16.3.5 | Restaurado desde 15.5.25; build y dev OK en Vercel (16 Sept 2026) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |

## Actualizaciones de Registros Contables (16 Sept 2026)

| Cambio | Detalle |
|---|---|
| Asientos AJUSTE de Notas de Crédito/Débito | `postNoteJournal` (`lib/services/notes-service.ts`) emite asiento AJUSTE balanceado (4101 Ingresos, 2105 ISV por pagar, contra 1101 Caja / 1103 Clientes) con ISV 15% incluido; best-effort, no bloquea la emisión |
| Fix API de empresas | `app/api/companies/route.ts` usaba `SUPABASE_URL` (undefined → HTTP 500); corregido a `NEXT_PUBLIC_SUPABASE_URL` |
| Variables de entorno | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`; NO existe `SUPABASE_URL` |

## Actualizaciones de Pólizas (17 Sept 2026)

`JournalEntryForm` conectado de verdad a API real (Etapa 1.1/1.2 completadas).

| Cambio | Detalle |
|---|---|
| Causa raíz | El formulario cargaba cuentas sin tenant (400) y guardaba sin tenant (401); además `POST /api/accounting/transactions` usaba Prisma (`DATABASE_URL` caído en runtime) con schema zod incompatible (centavos enteros + suma cero vs decimales + `isDebit`) |
| Servicio | `lib/services/journal-service.ts`: validación (balance ±0.01, ≥2 líneas, cuentas del tenant, fecha), consecutivo por tenant+tipo, inserción `Transaction` + `JournalEntry` (monto con signo + `type` DEBIT/CREDIT) con `service_role`. Acepta convención formulario (`amount` + `isDebit`) y notas (`amount` con signo) |
| API | `POST /api/accounting/transactions` reescrito sin Prisma (201 con transacción + líneas; 400 validación, 401 sin tenant). `postNoteJournal` (NC/ND) sigue compatible |
| UI | `JournalEntryForm.tsx`: tenant en ambos fetch (`x-tenant-id` + `?tenantId=`), recarga al cambiar empresa, avisos sin tenant / error de cuentas, N° de póliza al guardar |
| Tests | `tests/accounting/` (6 servicio con Supabase falso en memoria + 4 ruta, `node:test`); `npm test` → 59 pass |
| Build | `next build` → `EXIT=0` |

## Actualizaciones de Cierre Mensual (17 Sept 2026)

Cierre mensual automatizado (Etapa 3.1): el candado ahora se hace respetar.

| Cambio | Detalle |
|---|---|
| Causa raíz | Existían API de cierre y UI, pero nada impedía registrar en meses cerrados; `prev_month_closed`/`can_close` venían hardcodeados `true`; POST no exigía secuencia ni bloqueaba futuros |
| Reglas puras | `lib/services/period-closing.ts`: `prevPeriod`, `isFuturePeriod`, `assertCloseAllowed` (no futuro, mes previo con movimientos cerrado), `evaluatePeriodFlags` |
| Candado | `assertPeriodOpen` en `journal-service.ts`: `POST /api/accounting/transactions` rechaza (400) fechas en meses cerrados/bloqueados — cubre pólizas manuales y AJUSTE de NC/ND |
| API | POST exige secuencia + no futuro (400 con `prevPeriod`); GET calcula flags reales por mes (conteo diciembre previo incluido) |
| UI | `closing/page.tsx`: botón respeta `can_close` y muestra motivo ("Cierre primero el mes anterior" / "Período no disponible") |
| Tests | `tests/accounting/period-closing.test.mjs` (4 reglas) + candado en servicio (4 casos) + 400 en ruta; `npm test` → 65 pass |
| Build | `next build` → `EXIT=0` |

## Actualizaciones de Variaciones entre Períodos (17 Sept 2026)

Reporte comparativo mes a mes (Etapa 3.3).

| Cambio | Detalle |
|---|---|
| Servicio | `lib/services/period-variations.ts`: saldos por cuenta por rango (`Transaction`/`JournalEntry`/`Account` con fallback tenant), `computeVariations` (varianza absoluta/porcentual, tendencia sube/baja/igual/nueva/sale), totales y conteos |
| API | `GET /api/accounting/period-variations?tenantId=&from=YYYY-MM&to=YYYY-MM` (400 validación) |
| UI | `app/reports/period-variations/page.tsx` (selectores de meses, filtro monto mínimo y solo-cambios, tarjetas de totales, tabla con badges, CSV e impresión) + registro en el Centro de Reportes (financieros) |
| Tests | `tests/accounting/period-variations.test.mjs` (4) + `variations-route.test.mjs` (2); `npm test` → 81 pass |
| Build | `next build` → `EXIT=0` |

## Actualizaciones de Apertura Automática (17 Sept 2026)

Balance de apertura automático (Etapa 3.2): traslada saldos de cierre sin captura manual.

| Cambio | Detalle |
|---|---|
| Servicio | `lib/services/opening-balance.ts`: `computeOpeningBalances` (cierre al 31-dic previo por cuenta desde el mayor, neto debe−haber), `applyOpeningBalances` (casa por código con `chart_of_accounts`, escribe centavos + fecha 1-ene, respeta `overwrite`, omite ceros/sin catálogo/existentes, audita `OPENING_BALANCE_AUTO`, rehúsa enero cerrado vía `assertPeriodOpen`) |
| API | `POST /api/accounting/opening-balances/auto` `{year, apply?, overwrite?}`: sin `apply` devuelve vista previa (líneas, totales, `balanced`); con `apply` escribe y reporta aplicadas/omitidas |
| UI | Página de apertura: tarjeta con año + vista previa (cuentas, debe/haber, badge cuadrado) + aplicar con confirmación; fix de bug: el cálculo cliente guardaba decimales en columna de centavos (×100) |
| Tests | `tests/accounting/opening-balance.test.mjs` (7) + `opening-auto-route.test.mjs` (3); `npm test` → 75 pass |
| Build | `next build` → `EXIT=0` |

## Actualizaciones de Registros Contables (23 Sept 2026)

La jornada del 23 de Septiembre de 2026 cerró la integración contable de retenciones, los libros Mayor/Diario automáticos y el insert de `journal-service`. Detalle por archivos en `docs/LIBROS_LEGALES_REPORT.md` §2.5 (§Retenciones), §2.8 (§Libro Mayor/Diario) y §2.9 (comparativos).

| Cambio | Detalle |
|---|---|
| Asiento contable automático de retención | `lib/services/withholding-entries.ts` (`buildWithholdingJournalEntry`: débito gasto/costo + crédito retención por pagar, balanceado, montos base × tasa) + `app/api/accounting/withholding-journal/route.ts` (POST crea la póliza vía `createJournalTransaction` con deduplicado DUPLICADO; montos normalizados de **centavos → lempiras** en la póliza para no duplicar 100× en libros y balanza; GET consulta el asiento) + toggle "Asiento automático ON/OFF" **real y persistido por empresa** en `components/WithholdingManager.tsx` (localStorage `withholding_auto_entry:{tenant}`, verificado en el componente). Exportación Excel de los asientos `Asientos_Retenciones_{empresa}_{año}-{mes}.xlsx` — commits `e2d3361` + `af42c46` |
| Libro Mayor y Libro Diario automáticos desde transacciones | `lib/reports/general-ledger.ts` (clasificación ACTIVO/PASIVO/PATRIMONIO/INGRESO/GASTO por prefijo de cuenta, transform + grouping desde trial-balance, `transformToLibroDiario` con desglose entry-level cuando el item trae `journalEntry`/`date`, formatos Excel Mayor y Diario) + feeder detallado `app/api/accounting/trial-balance-detailed/route.ts` (cada movimiento con `journalEntry`+`date`+`reference` (=`voucherNumber`) y cuenta, todos los `voucherType`, ordenado por fecha) + página `app/companies/[id]/reports/general-ledger/page.tsx` (toggle Manual/Automático, toggle Mayor/Diario, exportación Excel) — commits `92cda55` + `af42c46` |
| Fix `createJournalTransaction` (insert en Supabase) | `lib/services/journal-service.ts`: antes el insert generaba solo `tenantId`/`totalAmount` (montos en unidades) y omitía `id`, `functionalAmount`, `originalTotal`, `createdAt`/`updatedAt`; la BD real exige esos campos y el POST fallaba al persistir asientos manuales y automáticos (retenciones, notas NC/ND). Ahora el servicio genera `id` UUID (`crypto.randomUUID()`), `functionalAmount`/`originalTotal`/`createdAt`/`updatedAt` y montos en **centavos** (patrón de `transaction-service-enhanced.ts`/`ExcelBooksUploader`/reversals), verificado con recorrido real de datos (insert + readback + limpieza OK contra Supabase). Pruebas `tests/accounting/journal-service.test.mjs` actualizadas a centavos — commit `ae11f9c` |
