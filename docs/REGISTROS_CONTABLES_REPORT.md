# Reporte de Estado y Plan de Ejecución: Registros Contables

> **Nota:** Este módulo ha sido combinado con "Estados Financieros" y "Libros Legales" en un solo módulo "Contabilidad". Ver `MASTER_REPORT.md` para el estado unificado.

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Catálogo de Cuentas** | Completo | 1 página | 3 rutas | 2 tablas | Supabase + Prisma |
| **Asientos Contables (Pólizas)** | Parcial | 1 página | 2 rutas | 2 tablas | Prisma |
| **Tipos de Comprobante** | Completo | En AccountingBooks | 1 ruta | — | Lógica en código |
| **Libros Contables** | Completo | 1 página | 2 rutas | 5 vistas | Supabase |
| **Cierre de Período** | Parcial | 1 página | 3 rutas | Config en GlobalSettings | Prisma |
| **Balances de Apertura** | Completo | 1 página | 1 ruta (GET/PUT) | 2 columnas en `chart_of_accounts` | Supabase |
| **Auditoría** | Completo | `/accounting/audit` | 2 rutas | 1 tabla (`account_audit_log`) | Supabase |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~72% | Catálogo y libros completos; balances de apertura; Balance de Comprobación 6 columnas; auditoría inmutable de saldos de apertura |
| Cobertura de Pruebas | 0% | No existen pruebas unitarias ni E2E |
| Estabilidad y Validaciones | ~65% | Validación de doble entrada implementada; middleware de períodos activo |
| Persistencia de Datos | ~80% | Supabase + Prisma para la mayoría; hook use-accounts usa mock data |
| Integración entre Módulos | ~50% | Integración con inventario y facturación parcial |
| Documentación y Tipado | ~40% | Sin tipos TypeScript dedicados para contabilidad |

---

## 2. Inventario Detallado por Sub-Área

### 2.1 Catálogo de Cuentas

**Estado: Completo (~90%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/accounting/ChartOfAccountsManager.tsx` | Gestor completo: vista jerárquica en árbol, CRUD, importación/exportación CSV, 3 plantillas (PYME 37, Comercial 53, Servicios 28), búsqueda/filtrado, auto-asignación de naturaleza, multi-divisa, código fiscal |
| `app/accounting/accounts/page.tsx` | Página de gestión del catálogo |
| `app/api/accounting/accounts/route.ts` | API CRUD para cuentas, sub-rutas `check-transactions` y `delete-all` |
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

_(Ninguna — catálogo validado completamente)_

---

### 2.2 Asientos Contables

**Estado: Parcial (~65%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/accounting/JournalEntryForm.tsx` | Formulario de asientos con tipo de comprobante, entrada múltiple débito/crédito, validación en tiempo real |
| `app/companies/[id]/accounting/voucher-form/page.tsx` | Formulario de póliza completo con selector de plantillas, duplicar, anular |
| `app/api/accounting/transactions/route.ts` | API CRUD de transacciones (GET/POST/PUT) |
| `app/api/accounting/voucher-number/route.ts` | Generación automática de números de comprobante |
| `lib/voucher-types.ts` | Tipos de comprobante (INGRESO, EGRESO, DIARIO, AJUSTE), numeración automática |
| `lib/voucher-categorization.ts` | Detección automática del tipo de comprobante |

#### Archivos de Plantillas de Asientos

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/accounting/journal-templates/page.tsx` | UI de gestión de plantillas: lista con preview de líneas, formulario crear/editar, duplicar, eliminar. Selector de cuentas con búsqueda. |
| `app/api/accounting/journal-templates/route.ts` | API CRUD (GET/POST/PUT/DELETE) para plantillas y sus líneas |
| `supabase/JOURNAL_ENTRY_TEMPLATES.sql` | Migración SQL: tablas `journal_entry_templates` y `journal_entry_template_lines` con RLS |

#### Tablas de Base de Datos

- `Transaction` (Prisma) — Encabezado: id, tenantId, date, description, reference, voucherType, voucherNumber, currency, exchangeRate, totalAmount
- `JournalEntry` (Prisma) — Líneas: id, transactionId, accountId, amount (BigInt), originalAmount, currency, exchangeRate
- `journal_entry_templates` (Supabase) — id, tenant_id, name, description, voucher_type, is_active, created_at, updated_at
- `journal_entry_template_lines` (Supabase) — id, template_id (FK), account_code, account_name, debit_enabled, credit_enabled, default_amount, sort_order

#### Lo que Falta

- **Formulario usa mockAccounts** en lugar de cuentas reales de la API
- **handleSubmit solo hace console.log**, no guarda realmente
- `use-accounts.ts` retorna datos mock
- Sin importación masiva de asientos
- Sin función de reversión ni asientos recurrentes

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

### 2.4 Cierre de Período

**Estado: Parcial (~50%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/YearEndClosing.tsx` | Wizard de cierre anual: revisión de balanza, asientos de ajuste, bloqueo de período |
| `lib/period-lock-middleware.ts` | Middleware Prisma que previene modificaciones en períodos cerrados |
| `app/closing/page.tsx` | Página de cierre |
| `app/api/closing/perform/route.ts` | Ejecución de cierre |
| `app/api/closing/trial-balance/route.ts` | Balanza para cierre |
| `app/api/closing/adjusting-entries/route.ts` | Asientos de ajuste |

#### Lo que Falta

- Sin cierre mensual automatizado
- Sin balance de apertura automático
- Sin reporte de variaciones entre períodos

---

### 2.5 Auditoría Contable

**Estado: Completo (~85%)**

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

1. Usuario guarda saldos de apertura → PUT `/api/accounting/opening-balances`
2. API actualiza `chart_of_accounts` (o `Account` table fallback)
3. Por cada cuenta modificada, inserta registro en `account_audit_log` con valores anteriores y nuevos
4. UI de auditoría carga logs → GET `/api/accounting/audit-logs`
5. API enriquece datos con `account_name` desde tabla `Account`
6. UI agrupa por día, renderiza con expand/collapse

#### Lo que Falta

- Auditoría solo cubre saldos de apertura (no transacciones ni JournalEntry en `account_audit_log`)
- Sin exportación de logs de auditoría a PDF/Excel

---

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | JournalEntryForm usa mockAccounts y handleSubmit no guarda | Funcionalidad principal rota | Crítica |
| 2 | use-accounts.ts retorna datos mock | Hook inútil en producción | Crítica |
| 3 | Sin tipos TypeScript para entidades contables | Errores en runtime | Alta |
| 4 | Sin cierre mensual automatizado | Riesgo de error humano | Media |
| 5 | Sin reversión de asientos contables | Correcciones manuales | Media |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Conexión del Formulario de Asientos a API

| # | Tarea | Archivos | Dependencias | Entregable |
|---|---|---|---|---|
| 1.1 | Conectar JournalEntryForm a API real (reemplazar mockAccounts) | `JournalEntryForm.tsx`, `use-accounts.ts` | Ninguna | Formulario funcional |
| 1.2 | Implementar guardado real en handleSubmit | `JournalEntryForm.tsx` | 1.1 | Asientos guardados en BD |
| 1.3 | Crear tipos TypeScript para entidades contables | `types/accounting.ts` | Ninguna | Archivo de tipos |

### Etapa 2: Plantillas y Asientos Recurrentes

| # | Tarea | Archivos | Dependencias | Entregable |
|---|---|---|---|---|
| ~~2.1~~ | ~~Crear sistema de plantillas de asientos~~ | ~~`lib/services/journal-templates.ts`~~ | ~~Etapa 1~~ | ✅ Completada — API `/api/accounting/journal-templates` + UI `/accounting/journal-templates` + selector en formulario de póliza |
| 2.2 | Implementar importación masiva de asientos | `lib/services/excel-import.ts` | Etapa 1 | Importación Excel |
| 2.3 | Implementar asientos de reversión | `lib/services/journal-reversal.ts` | Etapa 1 | Reversión automática |

### Etapa 3: Cierre Mensual y Períodos

| # | Tarea | Archivos | Dependencias | Entregable |
|---|---|---|---|---|
| 3.1 | Automatizar cierre mensual | `lib/services/monthly-closing.ts` | Etapa 1 | Cierre automático |
| 3.2 | Generar balance de apertura | `lib/services/opening-balance.ts` | 3.1 | Balance de apertura |
| 3.3 | Reporte de variaciones entre períodos | `app/reports/period-variations/page.tsx` | 3.1 | Reporte de variaciones |

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
| Etapa 3: Cierre Mensual | 3 tareas | Alta | 2-3 semanas |
| Etapa 4: Validación | 3 tareas | Media | 1-2 semanas |
| Etapa 5: QA | 3 tareas | Media | 1-2 semanas |
| **Total** | **15 tareas** | — | **6-11 semanas** |

---

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 15.5.25 | Downgraded desde 16.x (bug de Turbopack con .nft.json en Vercel) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |
