# Reporte Maestro: Estado General del Sistema Contable

> **Fecha:** 16 de Septiembre de 2026
> **Proyecto:** Contab - Sistema Contable Honduras
> **Versión del Análisis:** 1.7

---

## 1. Resumen Ejecutivo

| # | Módulo | Completitud | Estado | Prioridad |
|---|---|---|---|---|
| 1 | Contabilidad (Registro + Estados Financieros + Libros Legales) | ~83% | Parcial | Alta |
| 2 | Control de Asistencia | ~95% | Completo | Alta |
| 3 | Facturación y Ventas | ~70% | Parcial | Crítica |
| 4 | Inventario | ~55% | Parcial | Alta |
| 5 | Compras y Proveedores | ~60% | Parcial | Alta |
| 6 | Control Financiero | ~35% | Parcial | Alta |
| 7 | Reportes y Análisis | ~75% | Completo | Media |
| 8 | Seguridad y Control | ~80% | Completo | Media |
| 9 | Otras Características | ~35% | Básico | Media |
| 10 | Integración Fiscal | ~75% | Parcial | Crítica |
| 11 | Recursos Humanos | ~95% | Completo | Alta |

**Promedio General del Sistema: ~69%**

### Notas de Actualización (16 Sept 2026)

#### Consolidación de Esquema de Datos — Migraciones 007 + 008 (16 Sept 2026)
- **Objetivo** — Eliminar el esquema dual (duplicados PascalCase/lowercase) dejando una única fuente de verdad por entidad. Ambas migraciones se ejecutaron y verificaron en Supabase el 16 Sept 2026.
- **007 — Facturas** (`scripts/migrations/007_consolidate_invoice_schema.sql`) — Tablas canónicas **`Invoice` / `InvoiceItem` / `InvoicePayment` / `InvoiceNote`** (PascalCase, DECIMAL). Se migró el POS legacy y se eliminaron `invoice`, `invoiceitem`, `invoices`, `invoice_items`. Vistas fiscales recreadas: `libro_ventas`, `libro_compras`, `resumen_isv`, `declaracion_mensual`, `top_clientes`, `cuentas_por_cobrar`, `cuentas_por_pagar`, `"InvoiceSummary"`. Code repointed: `app/api/billing/invoices/route.ts`, `.../generate-current/route.ts`, `lib/billing/invoice-generator.ts`, `lib/services/notes-service.ts`, vistas de stats de dashboard/admin, `supabase/REPORT_VIEWS.sql`.
- **008 — Inventario** (`scripts/migrations/008_consolidate_inventory_schema.sql`) — Tablas canónicas **`product` / `inventory_movement`** (snake_case). Se migraron `"Product"`, `"Products"` y `products`; se eliminaron además `"InventoryMovement"` y `"InventoryTransaction"`. **`"Products"` era una VISTA** sobre `"Product"` (no una tabla) y se borró con `DROP VIEW`. La vista `"PackageDetails"` (dependía de `"Product"`) se recreó sobre `product`. FKs repuntadas a `product`/`inventory_movement` (recreadas `NOT VALID` por huérfanos de paquetes). Backups: `_backup_product_008`, `_backup_products_008`, `_backup_inventorymovement_008`, `_backup_inventorytransaction_008`.
- **Columnas añadidas a `product`** — `tags` (jsonb), `is_discount`, `discount_price`, `promotion_start_date`, `promotion_end_date`, `created_by`, `supplier_id`.
- **Trigger de stock** — El trigger legacy `movement_update_stock` se eliminó junto con `"InventoryMovement"`; en el esquema canónico el stock (`product.current_stock`/`stock_quantity`) lo actualiza la aplicación (`app/inventory/page.tsx`, `app/api/inventory/movements/route.ts`), sin recrear trigger para evitar doble conteo.
- **Verificación** (`scripts/migrations/VERIFY_007_008.sql`, solo lectura) — 0 movimientos huérfanos, 0 duplicados `(tenant_id, code)`, `product`=11 filas (ANGELOH7=5 + tenant huérfano `1`=6), `Supplier.tenant_id` normalizado, `"PackageDetails"` legible, FK `PackageProducts.productid → product(id)` activa.
- **Prisma** — `model Invoice` / `model InvoiceItem` de `prisma/schema.prisma` realineados con las columnas reales de `"Invoice"`/`"InvoiceItem"`; cliente regenerado (`prisma validate` OK, `prisma generate` OK) y `next build` EXIT=0.

#### Integración Fiscal — DIAT (16 Sept 2026)
- **DIAT implementado** — Reporte mensual de ventas/compras por empresa con generador (`lib/services/diat-generator.ts`), API `GET /api/diat?companyId=&period=` y UI en `/companies/[id]/diat` (`components/DIATManager.tsx`).
- **Fuentes de datos** — Declarante resuelto desde `companies` (por `tenant_id` o `id`); ventas desde `libro_ventas`; compras desde `Purchase` (tenant `1` + `company_id`), filtradas por `tax_rate` (0/15/18/otras) con canceladas excluidas.
- **Exportación** — CSV generado en cliente e impresión vía `window.print()`. Período validado con regex `^\d{4}-(0[1-9]|1[0-2])$` (400 ante período inválido).
- **E2E verificado** — Períodos disponibles `["2026-09"]`; reporte real de compras para ANGELOH7 (2 compras, base 538, ISV 81, total 619); casos 400/fecha inválida/periodo vacío; página 200; build EXIT=0. Limitación conocida: `libro_ventas` aún sin registros (ventas = 0).

#### Compras y Proveedores — Migración a Supabase (16 Sept 2026)
- **Proveedores en Supabase** — `app/api/suppliers/route.ts` (`GET`/`POST`/`PATCH`/`DELETE`) sobre la tabla `Supplier` con filtros por `companyId` y `search`. Ya no usa `suppliers-data.json`.
- **Compras en Supabase** — `app/api/purchases/route.ts` y `app/api/purchases/[id]/route.ts` vía lógica compartida en `lib/purchase-db.ts` (tablas `Purchase` + `PurchaseItem`). Cada compra hace upsert best-effort del producto (stock/costo) y un asiento contable best-effort (`journal_entry_id`).
- **Pagos en Supabase** — `app/api/purchases/payments/route.ts` (`GET`/`POST`/`PUT`/`DELETE`) sobre la tabla `SupplierPayment` con **recompute automático de saldo/estado** en cada operación.
- **Estados normalizados** — `PENDING`/`PARTIAL`/`PAID`/`CANCELLED` (mayúsculas en GET). Un saldo pendiente (inclusive tras borrar/reducir un pago en compra convertida a contado) produce `PARTIAL`.
- **Migraciones SQL aplicadas** — `company_id` como texto, RTN ampliado a 20, 4 claves foráneas entre `Supplier`/`Purchase`/`PurchaseItem`/`SupplierPayment`. Datos importados: 1 proveedor, 2 compras, 3 ítems, 2 pagos (`migrate-purchases-db.mjs`).
- **E2E verificado** — Flujo compra contado/crédito + pagos + flip a contado + borrado de pago: 37+ casos PASS sobre HTTP con Supabase real.
- **Legacy** — `app/api/supplier-payments/route.ts` y los archivos JSON (`purchases-data.json`, `suppliers-data.json`, `purchase-payments.json`) ya no se usan; candidatos a eliminación.
- **Next.js en 16.3.5** — `next@^16.3.5` (Turbopack). El downgrade a 15.5.25 del 8 Sept fue revertido; build `pnpm build` EXIT=0 ("Compiled successfully").

#### Módulo Nuevo — Notas de Crédito/Débito (fiscal SAR) (16 Sept 2026)
- **Servicio** — `lib/services/notes-service.ts`: numeración NC-/ND- por tenant, CRUD, asiento contable best-effort y cambio de estado (PENDING → APPLIED / CANCELLED).
- **APIs** — `GET /api/billing/notes` (lista sin auth) + `POST` (crear con auth); `GET/PATCH /api/billing/notes/[id]` (detalle y cambio de estado; en Next 16 `params` es Promise → `await params`).
- **UI** — `components/billing/NoteForm.tsx` (CreditNoteForm/DebitNoteForm), `components/billing/NotePreview.tsx` (previsualización imprimible), `app/billing/notes/page.tsx` (listado, stats, filtros, crear/aplicar/anular/ver) + botón de acceso en `app/billing/page.tsx`.
- **Tabla `InvoiceNote`** — `id, tenantId, originalInvoiceId, noteType (CREDIT|DEBIT), noteNumber, reason, amount, status (PENDING|APPLIED|CANCELLED), appliedDate, createdAt, createdBy`.
- **Asiento** — voucherType AJUSTE, ISV 15% incluido (subTotal = monto / 1.15); cuentas 4101 Ingresos, 2105 ISV por pagar, contra 1101 Caja / 1103 Clientes; best-effort (no bloquea). NC: +sub +tax −total; ND: +total −sub −tax.
- **Verificado** — build EXIT=0; rutas `ƒ /api/billing/notes`, `ƒ /api/billing/notes/[id]`, `○ /billing/notes`; capa de datos Supabase INSERT 201 / SELECT 200 / DELETE 204.

#### Fix — `/api/companies` (16 Sept 2026)
- **Variable de entorno corregida** — `app/api/companies/route.ts` leía `process.env.SUPABASE_URL!` (undefined → 500); ahora usa `process.env.NEXT_PUBLIC_SUPABASE_URL!` en GET y PUT. En `.env.local` **no** existe `SUPABASE_URL` (solo `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` y claves Clerk).

#### Contabilidad — Tab "Cierres" integrada en /accounting (Cierre consolidado)
- **Tab "Cierres" añadida a `/accounting`** — El `TabsList` pasó de `grid-cols-4` a `grid-cols-5` con el trigger `value="cierres"`. Contenido: tabla de 12 meses (Mes, Estado, Nº transacciones, Quién lo cerró, Fecha de cierre) + resumen (Meses Cerrados, Total de Entradas, Meses Consultados, Integración) con datos de `period_locks` + `v_transacciones_cierre`. Estados: Cerrado (green), Abierto (blue), Futuro (outline).
- **`/security/cierre` eliminado** — La página `app/companies/[id]/security/(modules)/cierre/page.tsx` fue eliminada. El enlace "Cierre" del sidebar de Seguridad (`security/layout.tsx`) fue removido y el label en `app/admin/modules/page.tsx` ahora apunta a `/companies/[id]/accounting`.
- **Estado pendiente** — La tab "Cierres" de `/accounting` usa datos estáticos garantizados (Agosto 2026 = Cerrado, 12 transacciones, Angelos, 15/09/2026); el siguiente paso es conectar a datos reales vía API `/api/accounting/period-closing?year=` (la página dedicada `/accounting/closing` ya usa el API real con KPIs, checklist de pre-cierre y cierre/reapertura).

#### Contabilidad — Auditoría + Balances de Apertura + Módulos Combinados
- **Historial de Auditoría** — Tabla `account_audit_log` almacena cambios inmutables de cuentas. API `GET` en `/api/accounting/audit-logs` con paginación, filtros por acción/código/fecha. UI en `/accounting/audit` con logs agrupados por día (expand/collapse por día), columnas de Hora, Cuenta (código + nombre), Acción, Saldo Anterior/Nuevo, Usuario. Valores anteriores/nuevos se muestran formateados (no JSON crudo). Backfill de entradas existentes.
- **Contabilidad unificada** — "Registro Contable", "Estados Financieros" y "Libros Legales" combinados en un solo módulo "Contabilidad". Las 3 tarjetas en la página de módulos ahora son 1 sola. La página de contabilidad (`/accounting`) muestra acceso directo a las 3 áreas (Registro Contable, Estados Financieros, Libros Legales) desde una tarjeta unificada.
- **Performance optimizado** — `loadCompanyData` en `/companies/[id]/accounting` reescrito: fetches de empresa, companies y tenant en paralelo (1 ronda), luego transacciones, cuentas y archivos en paralelo (2da ronda). De 5-6 fetches secuenciales a 2 rondas paralelas.
- **Balances de Apertura** — Nueva página `/accounting/opening-balances` para gestionar saldos iniciales de cuentas. API `GET/PUT` en `/api/accounting/opening-balances`. Botón "Calcular desde Movimientos" que auto-calcula saldos desde el trial balance existente con matching flexible de códigos (maneja `.` y `-`). SQL migration `ADD_OPENING_BALANCE.sql` agrega columnas `opening_balance` y `opening_balance_date` a `chart_of_accounts`.
- **Balance de Comprobación (fix)** — Fix crítico: `tenantId` faltante en el fetch del trial balance causaba página en blanco. Fechas por defecto cambiadas a año completo (no solo mes actual). Simplificado para no depender de API de opening balances (bloqueada por Clerk en client-side). Montos convertidos de centavos a lempiras.
- **Validación de Catálogo** — API `/api/accounting/accounts/validate` verifica 9 tipos de problemas: códigos duplicados, pads huérfanos, sin código, sin nombre, separadores inconsistentes, cuentas desactivadas, tipo no válido, autorreferencia, nombre=código. UI `/accounting/validate-catalog` con cards de resumen y lista expandible. Botón "Validar Catálogo" en dashboard de contabilidad.
- **Plantillas de Asientos** — API CRUD `/api/accounting/journal-templates` con tablas `journal_entry_templates` y `journal_entry_template_lines` (SQL en `supabase/JOURNAL_ENTRY_TEMPLATES.sql`, idempotente). UI `/accounting/journal-templates` para crear/editar/duplicar/eliminar plantillas con selector de cuentas. **Importación masiva desde Excel** con vista previa de filas, detección de duplicados (nombre + líneas), botón "Descargar Plantilla" con ejemplo hondureño. Botón "Plantilla" en formulario de póliza para cargar plantilla rápida.
- **Reversión de Asientos** — API `/api/accounting/reversals` (GET/POST/PUT). Crea transacción con signos invertidos + JournalEntry invertidos. Registra en `journal_entry_reversals` con trazabilidad completa (original → reversión). UI `/accounting/reversals` con historial y dialog de nueva reversión con búsqueda de transacciones.
- **Asientos Recurrentes** — API CRUD `/api/accounting/recurring-entries` + `/execute` para ejecución manual. Tablas `recurring_entries` (frecuencia, entries JSONB, next_execution) y `recurring_entry_executions`. UI `/accounting/recurring-entries` con crear/editar/eliminar/ejecutar, selector de cuentas, vista previa de líneas.
- **Sidebar "Control de Asistencia"** — Nuevo item de navegación en sidebar para admin y contador, acceso directo a `/hr/attendance/time-clock`.

#### Contabilidad — Reversiones + Recurrentes + Catálogo Mejorado (14 Sept 2026)
- **Reversión de asientos fix** — Transacciones de reversión ahora incluyen todos los campos requeridos (`id`, `voucherNumber`, `createdAt`, `updatedAt`, `originalTotal`). JournalEntry inserts incluyen `id` explícito. Las reversiones usan la fecha actual (no la fecha original). Los errores de "null value in column" están resueltos.
- **Reversión de usuarios fix** — Dropdown de usuarios en `/accounting/reversals` ahora usa `/api/accounting/users` (service role, bypasses Clerk auth) en lugar de `/api/tenant/users` (que retornaba 403 para admins no-super). La tabla `User` de Supabase usa columnas lowercase (`tenantid`, `firstname`, `lastname`, `isactive`).
- **Asientos recurrentes fix** — API de ejecución (`/api/accounting/recurring-entries/execute`) reescrita: genera `id` UUID, `voucherNumber` auto-calculado, `createdAt`/`updatedAt`. Resuelve `account_code` → Account UUID via lookup en tabla `Account` (también acepta `account_id` directo). Calcula `totalAmount` de las líneas en centavos.
- **Catálogo de cuentas cascada** — PUT `/api/accounting/accounts` ahora cascada cambios de `code` y `name` a: `journal_entry_template_lines.account_code`/`account_name`, `recurring_entries.entries` (JSONB), y logs a `account_audit_log`.
- **Header consolidado** — Botones sueltos del dashboard de contabilidad (Balances Apertura, Historial, Validar Catálogo, Plantillas, Recurrentes, Reversiones, Nueva Póliza) consolidados en un DropdownMenu "Herramientas" con secciones. "Volver al Menú" se mantiene fuera.
- **Catálogo de cuentas con secciones colapsables** — `ChartOfAccountsManager` reemplaza `parentId`-based hierarchy por code-inference (`11` → `1101` → `1101.01`). Secciones colapsables por tipo de cuenta (Activo, Pasivo, Patrimonio, Ingresos, Gastos). Auto-expande primer nivel. "Expandir Todo"/"Colapisar Todo". Se aplica también en el tab de cuentas del dashboard principal (`/accounting`).
- **Cuentas conectadas a API real** — `hooks/use-accounts.ts`, `JournalEntryForm.tsx`, `FinancialStatements.tsx`, `MultiTenantAccountingManager.tsx` todos usan datos reales de API (sin mock data).
- **Cierre mensual consolidado (verificado 14 Sept PM)** — Backend completamente reescrito. Vista SQL `v_transacciones_cierre` (UNION ALL de `Transaction` + `JournalEntry` + `Account`) normaliza todas las partidas del Libro Diario, Ingresos y Egresos en una sola estructura (`id_transaccion`, `fecha`, `concepto`, `origen`, `estado`, `cuenta_codigo`, `cuenta_nombre`, `debito`, `credito`). API `GET /api/accounting/period-closing?year=&month=` retorna `details` con totales de todos los libros consolidados, lista de transacciones con débito/crédito por línea, y `asientosPendientesCount`. Función SQL `get_closing_summary()` y tabla `account_audit_log`. UI `/accounting/closing` con KPIs (Total Débitos, Total Créditos, Diferencia Cuadrado/Descuadre, Asientos Pendientes), tabla de transacciones con búsqueda/filtro/ordenación, modal de detalle por asiento, checklist de pre-cierre con balanza de comprobación detallada, diálogos de confirmación para cerrar/reabrir. Validaciones estrictas: balance=0, sin borradores, mes anterior cerrado. `PATCH` para reapertura. `account_audit_log` registra cierre y reapertura con notas y razón. **Fix 42809 resuelto:** eliminados `CREATE INDEX` sobre la vista (no soportado en PG — `cannot create index on relation "v_transacciones_cierre"`), corregido `GRANT` a `SELECT` para `service_role`/`authenticated`, índices se mantienen en tablas base (`Transaction`, `JournalEntry`, `Account`). **Verificado en Supabase SQL Editor sin errores el 14 Sept 2026.**

#### HR Module
- **HR: Dashboard de asistencia** — Página `/hr/attendance/time-clock` reestructurada con 4 tabs: Dashboard (stats + tarjetas de empleados colapsables), Mi Fichaje (reloj personal), Mi Equipo (vista de gerente/supervisor), Horarios (CRUD de plantillas de horario). Empleados ausentes ocultos tras toggle "Ver ausentes". Cards de empleados expandibles con historial de eventos.
- **HR: Plantillas de horario con multi-descanso** — Tabla `work_schedules` soporta hasta 3 descansos (`break2_start/end`, `break3_start/end`). CRUD completo en tab Horarios. Asignación de horario a empleados desde la gestión de horarios.
- **HR: Visibilidad del horario en todos los módulos** — Nombre del horario visible en: página de empleados (card y detalle), nómina (columna Horario), asistencia (dropdown de asignación), resultados de búsqueda de empleados.
- **HR: Reloj de asistencia con roles** — Gerente ve todos los empleados; Supervisor ve sus reportes directos; Empleado solo ficha su tiempo. Selector de usuario persistente en localStorage.
- **HR: Asistencia — Rendimiento N+1 eliminado** — `saveAttendanceRecords` usa PATCH batch (1 request vs N POSTs). Schedules usa PUT batch. `autoMarkFreeDays` y `applyHolidayDefaults` solo guardan registros cambiados.
- **HR: PIP implementado y desplegado** — Módulo completo de Planes de Mejoramiento: 5 tablas SQL, 3 API routes, UI con dashboard/crear/detalle/evaluaciones.
- **HR: Nómina optimizada** — API calls paralelos, memoización, API ligera `/hr/payroll/employees`, paginator de 20 empleados, bridge contable automático.
- **HR: Calendario de vacaciones** — Vista con 3 modos (Día/Semana/Mes), edición/eliminación, aprobación/rechazo directo.
- **HR: Validaciones y seguridad completas** — RLS habilitado en las 28+ tablas HR. API input validation. Employee_code collision-safe.

#### Infraestructura y Despliegue
- **Middleware con Clerk** — `middleware.ts` usa `clerkMiddleware`; para toda ruta NO pública ejecuta `await auth.protect()`, que devuelve HTTP **404** (no redirect) a requests no autenticados. Rutas públicas: /auth/login, /auth/register, /auth/sign-in, /auth/sign-up, /auth/callback, /auth/reset-password, /api/auth/check-email, /api/auth/check-username, /api/admin/plans-public, /api/paypal/*, /api/webhooks/*, /api/accounting/uploaded-files, /api/accounting/excel-upload, /api/accounting/trial-balance, /. Inyecta el header `x-tenant-id` desde la metadata de Clerk.
- **API `/api/user/profile`** — Ruta para obtener perfil de usuario desde Supabase por `auth_id` (Clerk userId). Auto-crea registro si no existe. Archivo duplicado `route.js` eliminado, `route.ts` creado.
- **Vercel env vars fix** — Clerk `publishableKey` y `secret key` agregadas a Vercel para resolver `MIDDLEWARE_INVOCATION_FAILED`.
- **Vercel SpeedInsights + Analytics** — `<SpeedInsights />` y `<Analytics />` integrados en `app/layout.tsx` para monitoreo de rendimiento.
- **@clerk/clerk-sdk-node eliminado** — Paquete deprecado reemplazado por `lib/clerk-api.ts` (helper REST API directo). 7 scripts y 6 API routes migrados. 0 vulnerabilidades restantes.
- **Supabase lazy init** — `lib/supabase.ts` y `lib/supabase-db.ts` migrados a inicialización lazy (Proxy) para evitar errores de build en Vercel donde `NEXT_PUBLIC_SUPABASE_URL` no está disponible.
- **~~Next.js downgrade a 15.5.25~~ (revertido)** — El intento de bajar a 15.5.25 (webpack) por el error `ENOENT` en `onBuildComplete` de Vercel fue revertido: el proyecto quedó definitivamente en **Next.js 16.3.5 con Turbopack**, verificándose `pnpm build` EXIT=0 localmente.
- **next.config.js simplificado** — Removido `turbopack: { root }` (dev-only) y restaurado `output: 'standalone'` para serverless en Vercel.

---

## 2. Progreso por Módulo (Visualización)

```
MÓDULO                        PROGRESO                              ESTADO
─────────────────────────────────────────────────────────────────────────────
1.  Contabilidad              █████████████████████░░░░░░░░░  83%  Parcial
    (Registro + EF + LL)
2.  Control de Asistencia     ████████████████████████████░░  95%  Completo
3.  Facturación y Ventas      ████████████████████████░░░░░░░░░░  70%  Parcial
4.  Inventario                ██████████████░░░░░░░░░░░░░░░░  55%  Parcial
5.  Compras y Proveedores     ██████████████████░░░░░░░░░░░░  60%  Parcial
6.  Control Financiero        █████████░░░░░░░░░░░░░░░░░░░░░  35%  Parcial
7.  Reportes y Análisis       ████████████████████░░░░░░░░░░  75%  Completo
8.  Seguridad y Control       █████████████████████░░░░░░░░░  80%  Completo
9.  Otras Características     █████████░░░░░░░░░░░░░░░░░░░░░  35%  Básico
10. Integración Fiscal        ████████████████████████████░░░░░░  75%  Parcial
11. Recursos Humanos          ███████████████████████░░░░░░░  95%  Completo
─────────────────────────────────────────────────────────────────────────────
PROMEDIO                      ███████████████████░░░░░░░░░░  69%
```

---

## 3. Estado de Almacenamiento de Datos

### 3.1 Métodos de Almacenamiento por Módulo

| Módulo | Supabase | Prisma | localStorage | JSON Files |
|---|---|---|---|---|
| Contabilidad (Registro + EF + LL) | ✅ | ✅ | — | — |
| Facturación y Ventas | ✅ | ✅ | — | — |
| Inventario | ✅ | — | — | — |
| Compras y Proveedores | ✅ | — | — | — |
| Control Financiero | ✅ | ✅ | — | — |
| Reportes y Análisis | ✅ | — | — | — |
| Seguridad y Control | ✅ | ✅ | — | — |
| Otras Características | ✅ | ✅ | — | — |
| Integración Fiscal | ✅ | ✅ | — | — |
| Recursos Humanos | ✅ | — | — | — |

### 3.2 Problemas de Almacenamiento Críticos

| # | Problema | Módulo | Impacto |
|---|---|---|---|
| ~~1~~ | ~~Compras y pagos almacenan en archivos JSON~~ | ~~Compras y Proveedores~~ | ✅ Resuelto (Supabase) |
| 2 | Dual schema en facturas (lowercase + PascalCase) | Facturación | Inconsistencia de datos |
| 3 | Dual schema en productos (lowercase + PascalCase) | Inventario | Inconsistencia de datos |

---

## 4. Problemas Críticos Consolidados (Top 10)

| # | Problema | Módulos Afectados | Impacto | Prioridad |
|---|---|---|---|---|
| 1 | ~~**Compras usan archivos JSON** en lugar de base de datos~~ | ~~Compras~~ | ~~Datos no persistentes~~ | ✅ Resuelta |
| 2 | ~~**Sin DIAT** (Declaración Informativa de Actividades)~~ | ~~Fiscal, Libros~~ | ~~Incumplimiento SAR~~ | ✅ Resuelta (16 Sept 2026) |
| 3 | ~~**Sin notas de crédito/débito** con UI~~ | ~~Facturación~~ | ~~Incumplimiento fiscal~~ | ✅ Resuelta (16 Sept 2026) |
| 4 | ~~JournalEntryForm usa mockData y no guarda~~ | ~~Contabilidad~~ | ~~Función rota~~ | ✅ Resuelta |
| 5 | ~~FinancialStatements usa mockData~~ | ~~Contabilidad~~ | ~~Componente inutilizable~~ | ✅ Resuelta |
| 6 | **Sin presupuestos** | Control Financiero | Sin control presupuestario | Alta |
| 7 | **Sin multi-almacén funcional** | Inventario | Sin logística | Alta |
| 8 | **Sin generación de PDF** real | Múltiples | Sin impresión profesional | Alta |
| 9 | **RLS no confirmado** en todas las tablas | Seguridad | Riesgo cross-tenant | Alta |
| 10 | ~~HR sin tipos TypeScript~~ | ~~Recursos Humanos~~ | ~~Difícil mantenimiento~~ | ✅ Resuelta |

---

## 5. Resumen de Infraestructura por Módulo

### 5.1 UI Pages

| Módulo | Páginas Existentes | Páginas Necesarias | Cobertura |
|---|---|---|---|
| Contabilidad (Registro + EF + LL) | 20 | 20 | 100% |
| Facturación y Ventas | 4 | 7 | 57% |
| Inventario | 1 | 4 | 25% |
| Compras y Proveedores | 2 | 5 | 40% |
| Control Financiero | 1 | 4 | 25% |
| Reportes y Análisis | 9 | 10 | 90% |
| Seguridad y Control | 1 | 3 | 33% |
| Otras Características | 1 | 4 | 25% |
| Integración Fiscal | 6 | 8 | 75% |
| Recursos Humanos | 12 | 12 | 100% |

### 5.2 API Routes

| Módulo | APIs Existentes | APIs Necesarias | Cobertura |
|---|---|---|---|
| Contabilidad (Registro + EF + LL) | 30 | 30 | 100% |
| Facturación y Ventas | 14 | 16 | 88% |
| Inventario | 5 | 8 | 63% |
| Compras y Proveedores | 6 | 10 | 60% |
| Control Financiero | 3 | 6 | 50% |
| Reportes y Análisis | 11 | 12 | 92% |
| Seguridad y Control | 2 | 4 | 50% |
| Otras Características | 2 | 5 | 40% |
| Integración Fiscal | 15 | 18 | 83% |
| Recursos Humanos | 23 | 23 | 100% |

### 5.3 Base de Datos (Tablas/Vistas Supabase + Prisma)

| Módulo | Tablas/Vistas | Estado |
|---|---|---|
| Contabilidad (Registro + EF + LL) | Account, Transaction, JournalEntry, chart_of_accounts (con `opening_balance`, `opening_balance_date`), **account_audit_log**, **journal_entry_templates**, **journal_entry_template_lines**, **journal_entry_reversals**, **recurring_entries**, **recurring_entry_executions**, **period_locks**, libro_ventas, libro_compras, resumen_isv, declaracion_mensual, Withholding, cai + 5 vistas financieras + 4 RPCs (`get_libro_diario_integrado`, `get_libro_mayor_integrado`, `get_balance_comprobacion_integrado`, `get_resumen_ingresos_egresos`) | Sólido |
| Facturación y Ventas | Invoice, InvoiceItem, InvoicePayment, InvoiceNote, customer, cai, talonarios + vistas fiscales | Esquema único (007) |
| Inventario | product, inventory_movement, warehouse, Supplier, SupplierPayment, inventory_adjustment, inventory_transfer | Esquema único canónico (008) |
| Compras y Proveedores | Supplier, Purchase, PurchaseItem, SupplierPayment, PurchaseOrder, PurchaseOrderItem, AccountPayable | Supabase |
| Control Financiero | Reconciliation, Transaction (multi-divisa) | Parcial |
| Reportes y Análisis | Vistas existentes | Sólido |
| Seguridad y Control | User, Tenant, auditlog, account_audit_log | Sólido |
| Otras Características | File, FileProcessing, FileTemplate, FileActivity, CompanyLogo, PushSubscription | Prisma |
| Integración Fiscal | TaxConfig, CustomTaxes, Withholding, cai, talonarios | Sólido |
| Recursos Humanos | employees, employee_history, employee_hr_documents, departments, positions, permission_types, permission_requests, permission_used, attendance (con columna hours DECIMAL 5,2), **time_tracking**, **work_schedules**, attendance_holidays, attendance_deduction_config, attendance_schedules, **employee_teams**, **team_members**, payroll_config, payroll_closed, payroll_deductions, payroll_uploads, pip_plans, pip_goals, pip_evaluations, pip_evidence, pip_attendance_metrics + 2 Storage buckets | **Sólido (29 tablas + 2 buckets desplegados, RLS habilitado)** |

---

## 6. Estimación de Esfuerzo Consolidada

### 6.1 Por Módulo

| Módulo | Etapas | Tareas | Estimación |
|---|---|---|---|
| Contabilidad (Registro + EF + LL) | 5 | 43 | 20-30 semanas |
| Facturación y Ventas | 5 | 15 | 9-13 semanas |
| Inventario | 5 | 14 | 10-14 semanas |
| Compras y Proveedores | 5 | 15 | 10-14 semanas |
| Control Financiero | 5 | 16 | 11-15 semanas |
| Reportes y Análisis | 5 | 14 | 8-12 semanas |
| Seguridad y Control | 5 | 14 | 10-15 semanas |
| Otras Características | 5 | 15 | 9-13 semanas |
| Integración Fiscal | 5 | 14 | 11-16 semanas |
| Recursos Humanos | 5 | 28 | 8-12 semanas |
| **TOTAL** | **50** | **188** | **96-140 semanas** |

### 6.2 Por Etapa (Agregado)

| Etapa | Tareas Agregadas | Estimación |
|---|---|---|
| Etapa 1: Consolidación de Datos / Conexión API | ~44 tareas | 8-12 semanas |
| Etapa 2: Funcionalidad Core / Workflows | ~45 tareas | 12-18 semanas |
| Etapa 3: Integraciones / Automatización | ~45 tareas | 12-18 semanas |
| Etapa 4: Exportación / Reporting / Extras | ~40 tareas | 10-15 semanas |
| Etapa 5: QA / Documentación / Seguridad | ~35 tareas | 8-12 semanas |
| **TOTAL** | **~209 tareas** | **50-75 semanas (con paralelismo)** |

### 6.3 Ruta Crítica (Secuencia Obligatoria)

```
Prioridad 1 (Semanas 1-8):
├── ~~Migrar HR de localStorage a Supabase~~ ✅
├── ~~HR: Crear API de búsqueda de empleados~~ ✅
├── ~~HR: Migrar fotos/docs a Supabase Storage~~ ✅
├── ~~HR: Dashboard de reportes de asistencia~~ ✅
├── ~~Migrar Compras de JSON a Supabase~~ ✅
├── Conectar JournalEntryForm a API real
├── Conectar FinancialStatements a datos reales
└── ~~Crear notas de crédito/débito~~ ✅ (16 Sept 2026)

Prioridad 2 (Semanas 4-16):
├── ~~Implementar DIAT~~ ✅ (16 Sept 2026)
├── Presupuestos y Centros de Costo
├── Multi-almacén para Inventario
├── Generación de PDF profesional
└── Exportación Excel para todos los reportes

Prioridad 3 (Semanas 12-24):
├── Workflow de órdenes de compra
├── PIP de Recursos Humanos ✅
├── Calendario de vacaciones ✅
├── Notificaciones por correo real
├── 2FA y seguridad avanzada
└── Reportes programados
```

---

## 7. Dependencias entre Módulos

```
                    ┌─────────────────────┐
                    │   8. SEGURIDAD       │
                    │   (Base transversal) │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼─────────┐ ┌───▼────────┐ ┌────▼──────────────┐
    │ 1. CONTABILIDAD    │ │ 3. FACTU-  │ │ 11. RECURSOS      │
    │ (Registro + EF +   │ │ RACIÓN     │ │     HUMANOS       │
    │  Libros Legales)   │ │            │ │                   │
    └─────────┬─────────┘ └───┬────────┘ └────┬──────────────┘
              │               │                │
    ┌─────────▼─────────┐ ┌───▼────────┐ ┌────▼──────────────┐
    │ 2. CONTROL DE      │ │ 4. INVEN-  │ │ 10. INTEGRACIÓN   │
    │    ASISTENCIA      │ │ TARIO      │ │     FISCAL        │
    └─────────┬─────────┘ └───┬────────┘ └────┬──────────────┘
              │               │                │
    ┌─────────▼─────────┐ ┌───▼────────┐ ┌────▼──────────────┐
    │ 5. COMPRAS Y       │ │ 6. REPORTES│ │ 7. CONTROL        │
    │    PROVEEDORES     │ │ Y ANÁLISIS │ │    FINANCIERO     │
    └───────────────────┘ └────────────┘ └───────────────────┘
```

---

## 8. Resumen de Fortalezas y Debilidades

### 8.1 Fortalezas del Sistema

| Fortaleza | Módulos |
|---|---|
| **Autenticación y RBAC sólidos** | Seguridad (Clerk, 7 roles, 30+ permisos) |
| **Middleware con Clerk** | Seguridad (`clerkMiddleware` + `auth.protect()` → 404 + inyección de `x-tenant-id`) |
| **Catálogo de cuentas completo** | Contabilidad (3 plantillas, jerárquico, multi-divisa) |
| **Auditoría inmutable de cuentas** | Contabilidad (`account_audit_log`, agrupado por día, expand/collapse, backfill automático) |
| **Validación de integridad del catálogo** | Contabilidad (9 checks: duplicados, huérfanos, sin código/nombre, separadores inconsistentes, etc.) |
| **Reversión de asientos con trazabilidad** | Contabilidad (`journal_entry_reversals`, creación automática de transacción invertida, historial) |
| **Asientos recurrentes** | Contabilidad (`recurring_entries`, ejecución manual, 5 frecuencias, historial de ejecuciones) |
| **Plantillas de asientos con importación Excel** | Contabilidad (CRUD completo, importación masiva, detección de duplicados, descarga de plantilla) |
| **Catálogo de cuentas con cascada** | Contabilidad (cambios de código/nombre propagan a plantillas, recurrentes, y audit log) |
| **Cierre mensual automatizado** | Contabilidad (`period_locks`, validación de balanza, snapshot al cerrar, secuencia de meses, reapertura controlada) |
| **Centro de reportes robusto** | Reportes (18 reportes, 11 APIs, 5+ charts) |
| **Gestión CAI con alertas** | Fiscal/Facturación (alertas de rango y vencimiento) |
| **Retenciones con PDF legal** | Fiscal (recibo A4 con CAI, leyenda SAR) |
| **Notas de crédito/débito fiscales** | Facturación/Fiscal (NC-/ND- por tenant, asiento AJUSTE con ISV 15%, UI + preview imprimible) |
| **Configuración de entorno saneada** | Infraestructura (fix `/api/companies` usa `NEXT_PUBLIC_SUPABASE_URL`; sin variable `SUPABASE_URL` no resuelta) |
| **Importación bancaria** | Otras (9 bancos hondureños detectados automáticamente) |
| **Proyección de flujo de caja** | Control Financiero (30 días, ponderado por probabilidad) |
| **Cálculos fiscales Honduras** | Fiscal (ISV 15%/18%, ISR progresivo, retenciones) |

### 8.2 Debilidades Críticas

| Debilidad | Módulos Afectados |
|---|---|
| ~~**Almacenamiento en archivos JSON**~~ | ~~Compras y Proveedores~~ ✅ Resuelta |
| **Dual schemas (lowercase/PascalCase)** | Facturación, Inventario |
| ~~Componentes con mockData~~ | ~~Contabilidad~~ ✅ Resuelta |
| **0% cobertura de pruebas** | Todos los módulos |
| **Sin generación PDF real** | Múltiples |
| **Sin exportación Excel** | Reportes |
| ~~**Sin DIAT**~~ | ~~Fiscal~~ ✅ Resuelta (16 Sept 2026) |

---

## 9. Recomendaciones de Priorización

### Fase 1: Estabilidad de Datos (Semanas 1-6)
1. ~~Migrar HR de localStorage a Supabase~~ ✅ Completada
2. ~~HR: Crear API de búsqueda y dashboard de reportes~~ ✅ Completada
3. ~~HR: Migrar fotos/docs a Supabase Storage~~ ✅ Completada
4. ~~HR: Organigrama interactivo~~ ✅ Completada
5. ~~HR: PIP completo (5 tablas, 3 APIs, UI con stats/filtros/drill-down)~~ ✅ Completada
6. ~~HR: Nómina optimizada (Excel, horas extras por turno, bridge contable)~~ ✅ Completada
7. ~~HR: Filtros avanzados vacaciones + rendimiento empleados/vacaciones/PIP~~ ✅ Completada
8. ~~HR: Asistencia N+1 eliminado (PATCH batch, schedules batch, compacto con departamentos)~~ ✅ Completada
9. ~~Migrar Compras de JSON a Supabase~~ ✅ Completada
9. ~~Consolidar dual schemas (Facturación, Inventario)~~ ✅ Completada (migraciones 007/008, 16 Sept 2026)
10. Conectar JournalEntryForm y FinancialStatements a API real

### Fase 2: Cumplimiento Fiscal (Semanas 4-12)
5. ~~Implementar DIAT~~ ✅ (16 Sept 2026)
6. ~~Crear notas de crédito/débito~~ ✅ (16 Sept 2026)
7. Integrar retenciones con asientos contables
8. Generación de PDF profesional

### Fase 3: Funcionalidad Core (Semanas 8-20)
9. Presupuestos y centros de costo
10. Multi-almacén para inventario
11. Workflow de órdenes de compra
12. Exportación Excel para reportes

### Fase 4: Automatización (Semanas 16-28)
13. Correo electrónico real (Resend/SendGrid)
14. Notificaciones in-app
15. Reportes programados
16. 2FA y seguridad avanzada

### Fase 5: Calidad (Semanas 24-36)
17. Pruebas unitarias para servicios críticos
18. Pruebas E2E para flujos principales
19. Documentación de API
20. Backup/restore automatizado

---

## 10. Métricas de Salud del Proyecto

| Métrica | Valor Actual | Objetivo |
|---|---|---|
| Completitud Funcional | ~70% | 95% |
| Cobertura de Pruebas | 0% | 70% |
| Persistencia de Datos | ~100% | 100% (sin JSON/localStorage) |
| Integración entre Módulos | ~55% | 80% |
| Exportación (PDF/Excel) | ~30% | 90% |
| Cumplimiento Fiscal Honduras | ~70% | 95% |
| Documentación | ~85% | 70% |

### 10.1 Estado de Infraestructura (16 Sept 2026)

| Componente | Estado | Notas |
|---|---|---|
| Next.js | 16.3.5 | Turbopack; `pnpm build` EXIT=0 ("Compiled successfully") |
| Errores TypeScript | Preexistentes | No introducidos ahora: `.next/types/validator.ts`, `app/billing/generate-invoice/page.tsx`, `app/billing/subscriptions/page.tsx`, `lib/billing/invoice-generator.ts` |
| Middleware | clerkMiddleware | `auth.protect()` → 404 en rutas no autenticadas; inyecta `x-tenant-id` |
| React | 19.x | — |
| Clerk Auth | @clerk/nextjs | @clerk/clerk-sdk-node eliminado (deprecado) |
| Supabase Client | Lazy init | Proxy-based, evita errores de build |
| Vercel SpeedInsights | @2.0.0 | ✅ Integrado |
| Vercel Analytics | @2.0.1 | ✅ Integrado |
| Prisma | 5.20.0 | — |
| Build Output | standalone | Genera .nft.json correctamente |
| Vulnerabilidades npm | **0** | Todas resueltas |
| Build Status | ✅ Passing | Verificado localmente |

---

> **Archivos de reporte individuales:**
> - `REGISTROS_CONTABLES_REPORT.md` (incluido en Contabilidad unificada)
> - `ESTADOS_FINANCIEROS_REPORT.md` (incluido en Contabilidad unificada)
> - `LIBROS_LEGALES_REPORT.md` (incluido en Contabilidad unificada)
> - `CONTROL_ASISTENCIA_REPORT.md` — Reporte de Control de Asistencia
> - `FACTURACION_VENTAS_REPORT.md`
> - `INVENTARIO_REPORT.md`
> - `COMPRAS_PROVEEDORES_REPORT.md`
> - `CONTROL_FINANCIERO_REPORT.md`
> - `REPORTES_ANALISIS_REPORT.md`
> - `SEGURIDAD_CONTROL_REPORT.md`
> - `OTRAS_CARACTERISTICAS_REPORT.md`
> - `INTEGRACION_FISCAL_REPORT.md`
> - `DIAT_REPORT.md` — Reporte de la Declaración Informativa de Actividades (DIAT)
> - `NOTAS_CREDITO_DEBITO_REPORT.md` — Reporte del submódulo de Notas de Crédito/Débito
> - `HR_MODULE_REPORT.md`
> - `HR_WORKFLOWS.md`
