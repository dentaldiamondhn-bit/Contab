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
| **Auditoría** | Completo | En Dashboard | 1 ruta | 2 tablas | Supabase + Prisma |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~70% | Catálogo y libros completos; formulario de asientos no conectado a API |
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

#### Tablas de Base de Datos

- `chart_of_accounts` (Supabase) — id, company_id, code, name, type, nature, level, is_selectable, parent_id, currency, fiscal_code, balance, tenant_id
- `Account` (Prisma) — id, tenantId, name, code, type, description, parentId, isActive
- `account_audit_log` (Supabase) — Registro de auditoría a nivel de cuenta con JSONB old/new values

#### Lo que Falta

- Sin gestión de cuentas de balance de apertura
- Sin validación de integridad del catálogo (cuentas huérfanas)

---

### 2.2 Asientos Contables

**Estado: Parcial (~55%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/accounting/JournalEntryForm.tsx` | Formulario de asientos con tipo de comprobante, entrada múltiple débito/crédito, validación en tiempo real |
| `app/api/accounting/transactions/route.ts` | API CRUD de transacciones (GET/POST/PUT) |
| `app/api/accounting/voucher-number/route.ts` | Generación automática de números de comprobante |
| `lib/voucher-types.ts` | Tipos de comprobante (INGRESO, EGRESO, DIARIO, AJUSTE), numeración automática |
| `lib/voucher-categorization.ts` | Detección automática del tipo de comprobante |

#### Tablas de Base de Datos

- `Transaction` (Prisma) — Encabezado: id, tenantId, date, description, reference, voucherType, voucherNumber, currency, exchangeRate, totalAmount
- `JournalEntry` (Prisma) — Líneas: id, transactionId, accountId, amount (BigInt), originalAmount, currency, exchangeRate

#### Lo que Falta

- **Formulario usa mockAccounts** en lugar de cuentas reales de la API
- **handleSubmit solo hace console.log**, no guarda realmente
- `use-accounts.ts` retorna datos mock
- Sin importación masiva de asientos
- Sin plantillas de asientos contables
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

**Estado: Completo (~80%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/audit-middleware.ts` | Extensión Prisma para auditoría automática en Transaction y JournalEntry |
| `lib/audit-context.ts` | Configuración de contexto de auditoría desde NextRequest |
| `lib/services/audit-service.ts` | CRUD de auditoría con paginación |
| `components/dashboard/AuditFeed.tsx` | Feed de auditoría en tiempo real con auto-refresh (30s) |
| `app/api/audit-logs/route.ts` | API de logs de auditoría |

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
| 2.1 | Crear sistema de plantillas de asientos | `lib/services/journal-templates.ts` | Etapa 1 | Plantillas reutilizables |
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
| 4.1 | Validación de integridad del catálogo | `lib/services/account-validation.ts` | Etapa 1 | Validaciones server-side |
| 4.2 | Auditoría extendida (todos los modelos contables) | `lib/audit-middleware.ts` | Etapa 1 | Auditoría completa |
| 4.3 | Dashboard de auditoría contable | `app/accounting/audit/page.tsx` | 4.2 | Dashboard de auditoría |

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
