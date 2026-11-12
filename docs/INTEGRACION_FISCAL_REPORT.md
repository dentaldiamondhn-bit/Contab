# Reporte de Estado y Plan de Ejecución: Integración Fiscal

> **Actualizado:** 23 de Septiembre de 2026

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **ISV (Impuesto Sobre Ventas)** | Completo | 1 página | 3 rutas | Config en Prisma | Prisma |
| **Retenciones (+ asiento contable automático)** | Completo | 1 página | 2 rutas + `accounting/withholding-journal` | 1 tabla (`Withholding`) | Supabase |
| **CAI (Control de Autorización)** | Completo | 1 página | 6 rutas | 2 tablas | Supabase + Prisma |
| **Declaraciones Mensuales (SAR)** | Completo | 1 página | 1 ruta | 1 vista | Supabase |
| **DET-SAR 221 → carga automática al portal SAR** | Completo (23 Sept 2026) | `components/accounting/SARForm221.tsx` + `components/accounting/SARSessionPanel.tsx` | `app/api/accounting/det-upload/route.ts` + `app/api/accounting/sar-config/route.ts` | `system_settings` (config cifrada) | Supabase |
| **ISR (Impuesto Sobre Renta)** | Completo | En reportes | 1 ruta | — | Cálculos |
| **Tax Helper (Asistente)** | Completo | 1 página | 3 rutas | — | Prisma |
| **Configuración de Impuestos** | Completo | 1 página | 3 rutas | 2 tablas | Prisma + Supabase |
| **DIAT (+ carga automática al portal SAR)** | Completo (16 Sept; carga SAR 23 Sept 2026) | 1 página | 2 rutas (`/api/diat` + `accounting/diat-upload`) | — | Supabase (companies, libro_ventas, Purchase) |
| **Notas de Crédito/Débito (SAR)** | Completo | 1 página | 2 rutas | 1 tabla (`InvoiceNote`) | Supabase |
| **Validación Fiscal (CAI)** | ✅ Implementado | — | 1 middleware | — | — |
| **Declaraciones Anuales (ISV/ISR/Retenciones)** | Completo (datos reales + Excel + carga SAR, 22-23 Sept 2026) | `app/reports/annual-tax/page.tsx` | `app/api/accounting/annual-tax-upload/route.ts` (+ `lib/reports/annual-tax.ts`) | Datos reales | Supabase |
| **Sesión única verificada al portal SAR (Anuales/DET-221/DIAT)** | Completo (23 Sept 2026) | `components/accounting/SARSessionPanel.tsx` | `app/api/accounting/sar-session/route.ts` | `system_settings` (`sar_session:{empresa}`) | Supabase |
| **Envío en Línea SAR** | Completo — 3 subidores cifrados (Anuales, DET-SAR 221, DIAT) con sesión única verificada (23 Sept 2026) | SARForm221 + annual-tax + DIATManager | `annual-tax-upload`, `det-upload`, `diat-upload`, `sar-session` | config cifrada AES-256-GCM | Supabase |
| **DIN** | No Iniciado | 0 | 0 | 0 | — |
| **TCA** | No Iniciado | 0 | 0 | 0 | — |
| **Impresora Fiscal** | No Iniciado | 0 | 0 | 0 | — |
| **Señales de Cancelación** | No Iniciado | 0 | 0 | 0 | — |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~85% | ISV, retenciones (con asiento), CAI, DIAT (con carga SAR), notas NC/ND, Declaraciones Anuales (datos reales + Excel + carga SAR) y sesión única SAR sólidos; sin DIN, TCA, impresora fiscal |
| Cobertura de Pruebas | 0% | No existen pruebas |
| Cumplimiento SAR | ~75% | Formulario 221, DET, DIAT y Declaraciones Anuales con carga automática al portal SAR (credenciales cifradas AES-256-GCM, endpoint configurable, sesión única verificada); retenciones mensuales sin envío en línea |
| Integración Contable | ~90% | Tax Helper genera asientos; notas NC/ND generan asiento AJUSTE; **retenciones generan asiento automático** (débito gasto/costo + crédito retención por pagar, 23 Sept 2026) |
| Legislación Honduras | ~70% | ISV 15%/18%, ISR progresivo, retenciones 1%/12.5% implementados |

---

## 2. Inventario Detallado

### 2.1 ISV (Impuesto Sobre Ventas)

**Estado: Completo (~80%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/tax/isv-config.ts` | Tasas (15% estándar, 18% alcohol/tabaco), categorías, auto-categorización por palabras clave |
| `lib/services/isv-service.ts` | Creación de cuentas de pasivo ISV (2101/2102), generación de asientos con split base+ISV, reportes resumen |
| `lib/services/tax-config.ts` | CRUD de configuración de impuestos (TaxConfig) vía Prisma, vinculación a cuentas de pasivo |
| `components/TaxConfigManager.tsx` | UI de configuración de impuestos |
| `components/ISVTransactionForm.tsx` | Formulario de transacciones con ISV |
| `components/ISVReport.tsx` | Reporte resumen ISV por rango de fechas |
| `app/accounting/taxes/page.tsx` | Página CRUD de impuestos y retenciones (IVA/ISR/ISV/OTRO) |
| `app/api/tax-config/route.ts` | API GET/POST configuración |
| `app/api/tax-config/[id]/route.ts` | API individual |
| `app/api/tax-config/liability-accounts/route.ts` | API cuentas de pasivo |
| `app/api/isv/calculate/route.ts` | API de cálculo |
| `app/api/isv/summary/route.ts` | API de resumen |
| `app/api/isv/transaction/route.ts` | API de transacciones |
| `app/api/taxes/custom/route.ts` | API CRUD impuestos personalizados |

#### Tablas

- `TaxConfig` (Prisma) — id, name, rate, accountId (vínculo a cuenta pasivo), isActive
- `CustomTaxes` (Supabase) — name, rate 0-100%, enabled, tenant-scoped con RLS

---

### 2.2 Retenciones

**Estado: Completo (~80%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/services/withholding-service.ts` | CRUD, cálculo (1% y 12.5% servicios profesionales), estados, períodos, validación RTN, exportación CSV, agregación mensual/anual |
| `components/WithholdingManager.tsx` | UI completa: crear/editar, validación RTN, cálculo de montos, recibo PDF con CAI |
| `components/reports/WithholdingReceiptPDF.tsx` | Recibo PDF A4: datos emisor, badge CAI, proveedor, tabla impuestos, firmas, leyenda legal SAR |
| `components/dashboard/WithholdingDashboard.tsx` | Dashboard de retenciones |
| `app/withholding/page.tsx` | Página de gestión |
| `app/api/withholding/route.ts` | API de retenciones |
| `app/api/withholding-statistics/route.ts` | API de estadísticas |

#### Tabla

- `Withholding` (Supabase) — type, invoiceNumber, invoiceDate, providerName, providerRTN, amount, withholdingRate, withholdingAmount, period, status, receiptNumber

#### Funcionalidad

- Validación de RTN hondureño con algoritmo de dígito verificador (suma ponderada mod 11)
- Generación de número de recibo atómica vía RPC `get_next_withholding_number`
- Recibo PDF con formato legal

#### Lo que Falta

- ~~**Sin generación de asiento contable automático** por retención~~ ✅ Implementado (23 Sept 2026): `lib/services/withholding-entries.ts` (`buildWithholdingJournalEntry`, débito gasto/costo + crédito retención por pagar balanceado) + `app/api/accounting/withholding-journal/route.ts` (POST crea la póliza vía `createJournalTransaction`, montos en **lempiras** sin 100×, deduplicado DUPLICADO; GET consulta el asiento) + toggle persistido en `WithholdingManager.tsx` y exportación Excel de asientos — commits `e2d3361` + `af42c46`. Detalle en `docs/LIBROS_LEGALES_REPORT.md` §2.5

---

### 2.3 CAI (Control de Autorización de Impresos)

**Estado: Completo (~85%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/services/cai-service.ts` | CRUD completo: estados (ACTIVE/EXPIRING/EXPIRED/EXHAUSTED), alertas (rango 10 unidades, vencimiento 30/7 días), numeración, estadísticas |
| `components/dashboard/CAIDashboard.tsx` | Dashboard con alertas y estadísticas |
| `components/CAIManager.tsx` | Gestión de CAI |
| `app/cai/page.tsx` | Página de gestión |
| `app/api/billing/cai/route.ts` | API CAI |
| `app/api/billing/cai/[id]/route.ts` | API individual |
| `app/api/billing/cai/tenant/[tenantId]/route.ts` | CAI por tenant |
| `app/api/billing/cai/list/route.ts` | Lista de CAIs |
| `app/api/billing/cai/current/route.ts` | CAI activo actual |
| `scripts/migrations/CREATE_CAI_TABLE.sql` | Migración SQL |

#### Tablas

- `cai` (Prisma + Supabase) — id, cai, start_number, end_number, current_number, issue_date, expiration_date, status, tenant_id
- `talonarios` — Gestión de talonarios

---

### 2.4 Declaraciones Mensuales (SAR)

**Estado: Completo (~75%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/accounting/SARForm221.tsx` | Formulario 221: Débito Fiscal (casillas 401-405) y Crédito Fiscal (501-505), impuesto a pagar o saldo a favor; generación DET y **carga automática del DET al portal SAR** (23 Sept 2026) |
| `components/TaxReportingPage.tsx` | Reporte mensual: período, tablas de ventas/compras con ISV, resumen de pago SAR |
| `lib/services/tax-reporting.ts` | Generación de reportes mensuales para declaraciones SAR, exportación CSV |
| `lib/services/det-live-core.ts` | Formato SAR: registro 262 caracteres, campos definidos |
| `components/DETExportManager.tsx` | Generación de archivos DET .txt |
| `app/tax-reporting/page.tsx` | Página de reportes fiscales |
| `app/det/page.tsx` | Página de exportación DET |
| `app/api/tax-reporting/route.ts` | API de reportes |
| `app/api/det/route.ts` | API de DET |
| `app/api/reports/resumen-isv/route.ts` | API resumen ISV |
| `app/api/reports/declaracion-mensual/route.ts` | API declaración mensual |
| `lib/services/det-uploader.ts` + `app/api/accounting/det-upload/route.ts` + `app/api/accounting/sar-config/route.ts` | Carga automática DET-SAR 221 al portal SAR: `submitDETToSARR` (POST autenticado FormData + Basic, timeout 15s + retry, errorHint RED/CREDENCIALES/PORTAL/CONFIG) sobre credenciales cifradas AES-256-GCM por empresa y endpoint configurable guardado en `system_settings` (`sar_config:{empresa}`); la ruta re-exige la sesión única verificada (`SESION_NO_VERIFICADA` si no hay sesión) — commit `d42614a` |
| `components/accounting/SARSessionPanel.tsx` + `lib/services/sar-session.ts` + `app/api/accounting/sar-session/route.ts` | Sesión única verificada al portal SAR compartida por las 3 subidas (Anuales, DET-SAR 221 y DIAT): credenciales validadas en vivo (POST FormData + Basic, timeout 15s), sesión cifrada AES-256-GCM en `system_settings` clave `sar_session:{empresa}` con vencimiento 24 h y auto-reverificación, panel único que bloquea la subida sin estado `CONECTADO` — commit `e50d617`. Detalle en §6.3 |

#### Vistas de Supabase

- `resumen_isv` — ISV mensual (base gravada 15%/18%, montos ISV)
- `declaracion_mensual` — Ventas/compras base, ISV, ISV neto a pagar

---

### 2.5 ISR (Impuesto Sobre Renta)

**Estado: Completo (~70%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/reports/tax-summary.ts` | Cálculo ISR con escalas progresivas Honduras: 0% hasta L200K, 15% L200K-500K, 20% L500K-1M, 25% más de L1M |

---

### 2.6 Tax Helper

**Estado: Completo (~75%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/services/tax-helper.ts` | Procesa asientos contables y agrega entradas de crédito ISV automáticamente |
| `components/TaxHelperForm.tsx` | Formulario de asistente fiscal |
| `components/TaxableSwitch.tsx` | Toggle para marcar transacciones como gravables |
| `app/tax-helper/page.tsx` | Página del asistente |
| `app/api/tax-helper/process/route.ts` | API de procesamiento |
| `app/api/tax-helper/estimate/route.ts` | API de estimación |
| `app/api/tax-helper/create-transaction/route.ts` | API de creación de transacción con impuestos |

---

### 2.7 DIAT (Declaración Informativa de Actividades)

**Estado: Completo (~90%)** — no queda envío en línea pendiente (carga automática al portal SAR desde 23 Sept 2026).

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/services/diat-generator.ts` | Generador: período mensual, agrupación por tasa/CAI/proveedor, resumen de liquidación |
| `app/api/diat/route.ts` | API GET `?companyId=&period=` — retorna `{success, data: {companyId, availablePeriods, report}}` |
| `components/DIATManager.tsx` | UI: declarante, selector de período, KPIs, tablas de ventas/compras, CSV/impresión, **"Conectar al portal SAR" y "Subir DIAT al portal SAR" con validación de completitud y código de seguimiento** (23 Sept 2026) |
| `app/companies/[id]/diat/page.tsx` | Página DIAT por empresa |
| `lib/services/diat-uploader.ts` + `app/api/accounting/diat-upload/route.ts` | Carga automática DIAT→SAR cifrada (AES-256-GCM), `validateDiatCompleteness` y `extractTrackingCode`; config en `diat_sar_config:{empresa}` y último envío en `diat_sar_last_upload:{empresa}` — commit `f590680`. Detalle completo en `docs/DIAT_REPORT.md` §6.3 |

#### Fuentes de Datos

- Declarante: `companies` (por `tenant_id`, luego `id` → nombre, RTN, domicilio, régimen)
- Ventas: `libro_ventas` (fecha, total, CAI) — **PENDIENTE (datos, no código)**: sin registros cargados; al poblarse el libro, las ventas y la DIAT subida reflejarán datos reales
- Compras: `Purchase` (tenant `1` + `company_id`) — gravado por tasa fiscal (0/15/18/otras), canceladas excluidas

#### Lo que Falta

- ~~Envío en línea a SAR~~ ✅ Implementado (23 Sept 2026): carga automática cifrada al portal SAR con validación de completitud previa y código de seguimiento (commit `f590680`, sesión única `e50d617`)

---

### 2.8 Notas de Crédito/Débito (Fiscal SAR)

**Estado: Completo (~90%)**

Resuelve el item crítico de Facturación y Ventas (Notas de Crédito/Débito sin implementar). Detalle completo en `docs/NOTAS_CREDITO_DEBITO_REPORT.md`.

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/services/notes-service.ts` | `resolveTenantId`, `nextNoteNumber` (series independientes NC-XXXXXXXX / ND-XXXXXXXX por tenant), `listNotes`, `getNote`, `createNote`, `postNoteJournal`, `updateNoteStatus` |
| `app/api/billing/notes/route.ts` | GET lista (sin auth; filtros `type`/`status`/`from`/`to`) y POST crear (requiere auth Clerk) |
| `app/api/billing/notes/[id]/route.ts` | GET una nota; PATCH `{status}` para Aplicar/Anular (requiere auth). Next 16: `params` es Promise → `await params` |
| `components/billing/NoteForm.tsx` | `CreditNoteForm`/`DebitNoteForm`: factura original opcional, fecha, monto, motivo, contra-cuenta (efectivo/crédito), vista previa ISV 15% |
| `components/billing/NotePreview.tsx` | Documento fiscal imprimible (emisor, cliente, RTN, factura original + CAI, motivo, montos) con `window.print()` |
| `app/billing/notes/page.tsx` | Stats (Total, Créditos, Débitos, Efecto Neto ISV), filtros tipo/estado, crear/aplicar/anular/ver |
| `app/billing/page.tsx` | Botón de acceso al submódulo |

#### Esquema de Datos (`InvoiceNote`)

- `id` TEXT PK (`gen_random_uuid()`), `tenantId` FK `Tenant`, `originalInvoiceId` FK `Invoice` (nullable, ON DELETE SET NULL), `noteType` VARCHAR(20) CHECK (`CREDIT`/`DEBIT`), `noteNumber` VARCHAR(50), `reason` TEXT, `amount` DECIMAL(15,2) (Lempiras), `status` VARCHAR(20) CHECK (`PENDING`/`APPLIED`/`CANCELLED`) DEFAULT `PENDING`, `appliedDate` DATE, `createdAt`, `createdBy` FK `User`.
- RLS por tenant; índices por tenant y por factura original. Migración: `scripts/migrations/005_invoice_tables_consolidated.sql`.

#### Contabilidad (asiento AJUSTE)

- Asiento `voucherType = AJUSTE` **balanceado** (suma 0) contra `/api/accounting/transactions`; ISV 15% incluido: `subTotal = monto / 1.15`, `impuesto = monto - subTotal`.
- Cuentas: **4101** Ingresos, **2105** ISV por pagar, contra-cuenta **1101** Caja (efectivo) o **1103** Clientes (crédito).
- **NC:** +sub(4101), +tax(2105), −total(contra). **ND:** +total(contra), −sub(4101), −tax(2105).
- Asiento **best-effort**: los errores se registran (`console.error`) y NO bloquean la emisión de la nota.

#### Fiscales

- Las notas **NO consumen CAI propio**; referencian el **CAI de la factura original** (normativa SAR-HN). Numeración interna **NC-**/**ND-** por tenant.
- El documento impreso incluye la leyenda con el CAI de la factura original.

#### Verificación (16 Sept 2026)

- `pnpm build` → **EXIT=0**. Rutas compiladas: `ƒ /api/billing/notes`, `ƒ /api/billing/notes/[id]`, `○ /billing/notes`.
- Prueba de capa de datos contra Supabase: `InvoiceNote` INSERT 201, SELECT 200, DELETE 204; `Invoice` SELECT 200.

#### Pendientes / Limitaciones

- Impresión por `window.print()` (sin PDF server-side profesional).
- Anulación permanente sin contra-asiento automático.
- Serie NC/ND no validada contra rango CAI (depende de la factura original).
- Sin emisión/sincronización a plataforma SAR.

---

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | ~~Sin DIAT~~ | ~~Incumplimiento SAR obligatorio~~ | ✅ Implementado (16 Sept 2026) |
| 2 | Sin DIN | Sin identificación numérica fiscal | Alta |
| 3 | Sin TCA | Sin control de acceso fiscal | Alta |
| 4 | Sin impresora fiscal | Imposible emitir comprobantes fiscales | Alta |
| 5 | ~~Retenciones sin asiento contable~~ | ~~Doble registro~~ | ✅ Resuelto (23 Sept 2026: `withholding-entries.ts` + `app/api/accounting/withholding-journal/route.ts`, asiento balanceado en lempiras — commits `e2d3361`+`af42c46`) |
| 6 | ~~Sin declaraciones anuales~~ | ~~Incumplimiento fiscal~~ | ✅ Resuelto (22-23 Sept 2026: `lib/reports/annual-tax.ts` + `app/reports/annual-tax/page.tsx` con datos reales + Excel + carga al portal SAR — commits `cad7739`+`d59c74f`) |
| 7 | ~~Sin envío en línea SAR~~ | ~~Proceso manual~~ | ✅ Resuelto (23 Sept 2026: 3 subidores cifrados — Declaraciones Anuales `d59c74f`, DET-SAR 221 `d42614a`, DIAT `f590680` — con sesión única verificada al portal SAR `e50d617`) |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: DIAT, Notas NC/ND y Compliance SAR (DIAT ✅, Notas NC/ND ✅, queda validación SAR)

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 1.1 | ~~Generador de DIAT~~ | ~~`lib/services/diat-generator.ts`~~ | ✅ Generador (16 Sept 2026) |
| 1.2 | ~~UI de DIAT~~ | ~~`app/diat/page.tsx`~~ → `app/companies/[id]/diat/page.tsx` + `components/DIATManager.tsx` | ✅ Página + API (16 Sept 2026) |
| 1.3 | ~~Notas de Crédito/Débito (fiscal SAR)~~ | ~~`lib/services/notes-service.ts` + `app/api/billing/notes[/id]` + `app/billing/notes`~~ | ✅ Notas NC/ND (16 Sept 2026) |
| 1.4 | ~~Asiento contable de notas~~ | ~~`postNoteJournal` (voucherType AJUSTE, balanceado, ISV 15%)~~ | ✅ Asiento NC/ND (16 Sept 2026) |
| 1.5 | Validación de compliance SAR | `lib/services/sar-compliance.ts` | Validaciones |

### Etapa 2: Integración Contable de Retenciones

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 2.1 | ~~Asiento contable automático por retención~~ | ~~`lib/services/withholding-accounting.ts`~~ → `lib/services/withholding-entries.ts` + `app/api/accounting/withholding-journal/route.ts` | ✅ Asiento automático balanceado (23 Sept 2026, montos en lempiras) |
| 2.2 | Asiento contable por ISV cobrado | `lib/services/isv-accounting.ts` | Asiento |
| 2.3 | Conciliación fiscal-contable | `lib/services/tax-reconciliation.ts` | Validación |

### Etapa 3: DIN, TCA y Fiscal

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 3.1 | Gestión de DIN | `lib/services/din-service.ts` + UI | DIN |
| 3.2 | Gestión de TCA | `lib/services/tca-service.ts` + UI | TCA |
| 3.3 | Integración impresora fiscal | `lib/services/fiscal-printer.ts` | Impresión |

### Etapa 4: Declaraciones y Envío

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 4.1 | ~~Declaración anual consolidada~~ | ~~`lib/services/annual-declaration.ts`~~ → `lib/reports/annual-tax.ts` + `app/reports/annual-tax/page.tsx` | ✅ Declaraciones Anuales (ISV/ISR/Retenciones) con datos reales + Excel (22 Sept 2026) |
| 4.2 | ~~Envío en línea a SAR~~ | ~~`lib/services/sar-submission.ts`~~ → `lib/services/annual-tax-uploader.ts` + `det-uploader.ts` + `diat-uploader.ts` + `sar-session.ts` | ✅ 3 subidores cifrados con sesión única verificada (23 Sept 2026) |
| 4.3 | Dashboard de cumplimiento fiscal | `app/fiscal-compliance/page.tsx` | Dashboard |

### Etapa 5: QA

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 5.1 | Pruebas de cálculos fiscales | `__tests__/fiscal/` | Pruebas |
| 5.2 | Pruebas E2E de cumplimiento | `__tests__/e2e/fiscal/` | Pruebas E2E |

---

## 5. Estimación de Esfuerzo

| Etapa | Tareas | Complejidad | Estimación |
|---|---|---|---|
| Etapa 1: DIAT (✅) + Notas NC/ND (✅) + Compliance SAR | 1 tarea | Media | 1 semana |
| Etapa 2: Contabilidad | 3 tareas | Media | 2-3 semanas |
| Etapa 3: DIN/TCA/Fiscal | 3 tareas | Alta | 3-4 semanas |
| Etapa 4: Declaraciones | 3 tareas | Alta | ✅ 4.1 y 4.2 completadas (22-23 Sept 2026); 4.3 pendiente |
| Etapa 5: QA | 2 tareas | Media | 1-2 semanas |
| **Total** | **12 tareas** | — | **9-14 semanas** |

---

## 6. Carga automática al portal SAR (23 Sept 2026)

Tres subidores cifrados (Declaraciones Anuales, DET-SAR 221 y DIAT) comparten una **sesión única verificada en vivo contra el portal SAR**.

### 6.1 Declaraciones Anuales

- `lib/services/annual-tax-uploader.ts`: `submitAnnualTaxToSARR` (POST/PUT autenticado FormData + Basic, timeout 15s + retry, `validateAnnualTaxCompleteness` errors bloqueantes/warnings permisivos, errorHint RED/CREDENCIALES/PORTAL/CONFIG) sobre credenciales cifradas AES-256-GCM.
- `app/api/accounting/annual-tax-upload/route.ts`: `get-config`/`save-config`/`test`/`upload`; config cifrada en `system_settings` clave `annual_tax_sar_config:{empresa}`; el `upload` valida completitud (con errors NO envía y devuelve `validationErrors`; solo warnings envía + `warnings`; éxito devuelve `summaryPreview` con los montos reales enviados).
- Commits: `d59c74f` (carga), `cad7739` (datos reales + Excel).

### 6.2 DET-SAR 221

- `lib/services/det-uploader.ts`: `submitDETToSARR` (POST autenticado FormData + Basic, timeout 15s + retry, DETUploadResult con errorHint clasificado).
- `app/api/accounting/det-upload/route.ts` (envío) + `app/api/accounting/sar-config/route.ts` (config cifrada AES-256-GCM por empresa, endpoint configurable, guardada en `system_settings` clave `sar_config:{empresa}`).
- Commit: `d42614a`.

### 6.3 DIAT

- `lib/services/diat-uploader.ts`: `submitDiatToSARR` (POST autenticado FormData + Basic, timeout/retry, clasificación SUCCESS/CREDENCIALES/RED/PORTAL/CONFIG, `extractTrackingCode` para el código de seguimiento) y `validateDiatCompleteness`.
- `app/api/accounting/diat-upload/route.ts`: `get-config`/`save-config`/`test`/`upload`; config en `diat_sar_config:{empresa}` y último envío en `diat_sar_last_upload:{empresa}`; mapeo HTTP SUCCESS 200 / CREDENCIALES 401 / RED 502 / PORTAL 503 / CONFIG 500.
- Commit: `f590680`. Detalle completo en `docs/DIAT_REPORT.md` §6.3.

### Sesión única verificada (compartida por 6.1/6.2/6.3)

- `lib/services/sar-session.ts`: `verifySARCredentials` valida las credenciales en vivo contra el portal (POST FormData usuario/clave/periodo/formulario ISV DECLARACION_ANUAL + Basic + timeout 15s; `SESSION_DEFAULT_TTL_MS = 24 h`); sesión cifrada AES-256-GCM en `system_settings` clave `sar_session:{empresa}`; `isSARSessionValid` y `getLiveSARSession` (auto-reverificación con credenciales guardadas al vencer).
- `app/api/accounting/sar-session/route.ts`: GET (estado público sin sessionToken) / POST (persiste sesión y sincroniza credenciales de los 3 subidores preservando metodo/tipoDeclaracion/periodo) / DELETE (cierre); HTTP mapeado: CONECTADO 200 / CREDENCIALES_INVALIDAS 401 / PORTAL_NO_DISPONIBLE 502 / CONFIG_INCOMPLETA 422.
- `components/accounting/SARSessionPanel.tsx`: panel único montado en las 3 pantallas que bloquea la subida salvo estado `CONECTADO`; las rutas de upload incluyen `getLiveSARSession`+`isSARSessionValid` y devuelven `SESION_NO_VERIFICADA` sin conectar.
- Commit: `e50d617`.

---

## Actualizaciones de Integración Fiscal (16 Sept 2026)

| Cambio | Detalle |
|---|---|
| DIAT implementado | Generador `lib/services/diat-generator.ts` + API `app/api/diat/route.ts` + UI `/companies/[id]/diat` (`components/DIATManager.tsx`) |
| Fuentes | companies / libro_ventas / Purchase; período validado `^\d{4}-(0[1-9]\|1[0-2])$` |
| Exportación | CSV en cliente + impresión (`window.print()`) |
| E2E | Períodos `["2026-09"]`; reporte ANGELOH7 (2 compras, base 538, ISV 81, total 619); 400s; build EXIT=0 |
| Notas de Crédito/Débito implementadas | `lib/services/notes-service.ts` + `app/api/billing/notes[/id]` + `components/billing/NoteForm.tsx`/`NotePreview.tsx` + `app/billing/notes` |
| Asiento AJUSTE de notas | `postNoteJournal`: 4101/2105 + contra 1101/1103, ISV 15% incluido, balanceado, best-effort |
| Fiscales NC/ND | No consumen CAI propio; referencian CAI de la factura original (SAR-HN); numeración interna NC-/ND- |
| Verificación notas | Build EXIT=0; rutas `ƒ /api/billing/notes`, `ƒ /api/billing/notes/[id]`, `○ /billing/notes`; INSERT 201 / SELECT 200 / DELETE 204 |
| Fix env | `app/api/companies/route.ts` usa `NEXT_PUBLIC_SUPABASE_URL` (no `SUPABASE_URL`) |

## Validación Fiscal de CAI (18 Sept 2026)

### Nuevo Middleware: `lib/middleware/fiscal-validation.middleware.ts`

**Propósito:** Valida documentos fiscales con CAI antes de guardar, verificando:
1. La fecha actual sea menor a la fecha límite de emisión (expiryDate)
2. El número correlativo no supere el rango autorizado (rangeEnd)
3. La fecha de emisión no sea posterior a la expiración del CAI
4. El voucher number esté dentro del rango [rangeStart, rangeEnd]

**Uso en API routes:**

```typescript
import { validateFiscalDocument } from '@/lib/middleware/fiscal-validation.middleware';

const result = await validateFiscalDocument({
  caiId: 'xxx',
  issueDate: new Date(),
  voucherNumber: 1234,
});

if (!result.valid) {
  return NextResponse.json({ error: result.reason }, { status: 400 });
}
```

**Campos de respuesta:**

| Campo | Tipo | Descripción |
|---|---|---|
| `valid` | boolean | Si el documento es válido |
| `reason` | string | Razón de rechazo (si aplica) |
| `caicCode` | string | Código CAI validado |
| `expiryDate` | string | Fecha de expiración del CAI |
| `daysUntilExpiry` | number | Días hasta expiración |
| `remainingInRange` | number | Facturas restantes en el rango |
| `canGenerate` | boolean | Si se puede generar el documento |

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 16.3.5 | Restaurado desde 15.5.25; build y dev OK en Vercel (16 Sept 2026) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |

## Actualizaciones de Integración Fiscal (23 Sept 2026)

| Cambio | Detalle |
|---|---|
| Declaraciones Anuales → carga automática al portal SAR | `lib/services/annual-tax-uploader.ts` + `app/api/accounting/annual-tax-upload/route.ts` (`get-config`/`save-config`/`test`/`upload`, config cifrada AES-256-GCM en `system_settings`, `validateAnnualTaxCompleteness` bloqueante/warnings, HTTP mapeado, `summaryPreview` con los montos reales) — commit `d59c74f` |
| DET-SAR 221 → carga automática al portal SAR | `lib/services/det-uploader.ts` (`submitDETToSARR`) + `app/api/accounting/det-upload/route.ts` + `app/api/accounting/sar-config/route.ts` (config cifrada por empresa `sar_config:{empresa}`, endpoint configurable) — commit `d42614a` |
| DIAT → conexión al portal SAR con carga automática cifrada | `lib/services/diat-uploader.ts` (`submitDiatToSARR`, `extractTrackingCode`, `validateDiatCompleteness`) + `app/api/accounting/diat-upload/route.ts` + botones en `components/DIATManager.tsx` — commit `f590680` |
| Sesión única verificada al portal SAR (Anuales / DET-SAR 221 / DIAT) | `lib/services/sar-session.ts` (verificación en vivo, sesión cifrada 24 h, auto-reverificación) + `app/api/accounting/sar-session/route.ts` + `components/accounting/SARSessionPanel.tsx` + wrappers en las 3 rutas de upload (`SESION_NO_VERIFICADA`) — commit `e50d617` |
| Retenciones → asiento contable automático | `lib/services/withholding-entries.ts` + `app/api/accounting/withholding-journal/route.ts` (póliza balanceada en lempiras, deduplicado) + toggle persistido en `WithholdingManager.tsx` — commits `e2d3361`+`af42c46` |
| Fix insert `createJournalTransaction` | `lib/services/journal-service.ts` genera `id`/`functionalAmount`/`originalTotal`/`createdAt`/`updatedAt` en centavos para persistir asientos manuales y automáticos en Supabase — commit `ae11f9c` |
| Cash flow comparativos trimestrales (Q1–Q4) | `lib/reports/cash-flow-comparatives.ts` + `app/api/accounting/cash-flow-comparatives/route.ts` + `app/reports/cash-flow-comparatives/page.tsx` con exportación Excel — commits `a9ce620`+`89fad97` (ver `docs/ESTADOS_FINANCIEROS_REPORT.md` §2.3.1) |
