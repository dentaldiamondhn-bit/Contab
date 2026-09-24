# Reporte de Estado y Plan de Ejecución: Libros Legales

> **Nota:** Este módulo ha sido combinado con "Registros Contables" y "Estados Financieros" en un solo módulo "Contabilidad". Ver `MASTER_REPORT.md` para el estado unificado.

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables/Vistas | Almacenamiento |
|---|---|---|---|---|---|
| **Libro de Compras** | **Completo — generación automática + exportación Excel** | 1 página | 1 ruta | 1 vista | Supabase |
| **Libro de Ventas** | **Completo — generación automática + exportación Excel** | 1 página | 1 ruta | 1 vista | Supabase |
| **Libro de Inventarios y Balances** | Completo | 1 página | — | 1 vista | Supabase |
| **Formulario SAR 221 (ISV)** | **Completo — generación automática + carga al portal SAR** | 1 componente | — | — | Cálculos en código |
| **Exportación DET (SAR)** | Completo | 1 componente | 1 ruta | — | Generación archivo .txt |
| **Retenciones** | **Completo — generación automática + asiento contable automático + exportación Excel** | 1 página | 2 rutas | 1 tabla | Supabase + Prisma |
| **ISV (Impuesto Sobre Ventas)** | Parcial | 1 página | 2 rutas | Config en Prisma | Supabase + Prisma |
| **Cierre Anual** | Parcial | 1 página | 3 rutas | Config | Prisma |
| **DIAT** | Completo | 1 página | 1 ruta | — | Supabase (libro_ventas, Purchase, companies) |
| **Declaraciones Anuales** | **Completo — declaraciones automáticas desde transacciones contables + exportación Excel + carga al portal SAR** | `app/reports/annual-tax/page.tsx` + `lib/reports/annual-tax.ts` + `lib/services/annual-tax-uploader.ts` + `app/api/accounting/annual-tax-upload/route.ts` (22-23 Sept 2026) | API | Datos reales | Generación automática + adaptador SAR |
| **Libro Mayor y Libro Diario** | **Completo — generación automática + exportación Excel** | 1 página | 1 ruta | — | Supabase |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~97% | Libros, SAR 221, DIAT y Declaraciones Anuales completos |
| Cobertura de Pruebas | 0% | No existen pruebas |
| Exportación | ~93% | Declaraciones Anuales y los libros legales (Compras, Ventas, Retenciones, Mayor y Diario) exportan a Excel (23 Sept 2026); sin PDF profesional |
| Cumplimiento SAR | ~75% | Formulario 221, DET, DIAT y Declaraciones Anuales con carga automática al portal SAR (credenciales cifradas AES-256-GCM, endpoint configurable); sin envío en línea para retenciones mensuales |
| Integración Contable | ~100% | Retenciones generan asiento contable automático balanceado (débito gasto/costo + crédito retención por pagar, montos base × tasa, 23 Sept 2026) |

---

## 2. Inventario Detallado

### 2.1 Libro de Compras

**Completo (~95%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/legal/PurchaseBook.tsx` | Libro de Compras: carga de vista `libro_compras`, filtros por rango de fechas, exportación CSV/PDF, totales de monto, crédito fiscal, CF pendiente, info fiscal SAR |
| `app/reports/libros-compras-ventas/page.tsx` | Página de libros de compra/venta |
| `app/api/reports/libro-compras/route.ts` | API de datos |
| `lib/reports/purchase-book.ts` | Libro de Compras automático: clasificación COMPRA/GASTO/IMPUESTO/OTRO, transform + grouping desde trial-balance, formato Excel (22 Sept 2026) |
| `app/companies/[id]/reports/purchase-book/page.tsx` | Página empresarial: toggle fuente Manual/Automática (contable) y exportación a Excel (22 Sept 2026) |

#### Vista de Supabase

- `libro_compras` — Desde tabla Invoice (invoicetype='EXPENSE'), muestra número, fecha, proveedor, RTN, subimpuesto, total

#### Capacidades

- Generación automática desde transacciones contables (modo Automático, trial-balance del mes/año seleccionados)
- Exportación a Excel (.xlsx)
- Exportación CSV/PDF y vista manual intactas

---

### 2.2 Libro de Ventas

**Estado: Completo (~95%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/legal/SalesBook.tsx` | Libro de Ventas: carga de vista `libro_ventas`, filtros, CSV/PDF, totales de débito fiscal, DF pendiente |
| `app/api/reports/libro-ventas/route.ts` | API de datos |
| `lib/reports/sales-book.ts` | Libro de Ventas automático: clasificación VENTA/INGRESO/IMPUESTO/OTRO, transform + grouping desde trial-balance, formato Excel (22 Sept 2026) |
| `app/companies/[id]/reports/sales-book/page.tsx` | Página empresarial: toggle fuente Manual/Automática (contable) y exportación a Excel (22 Sept 2026) |

#### Vista de Supabase

- `libro_ventas` — Desde tabla Invoice (invoicetype='CUSTOMER'), muestra datos fiscales

#### Capacidades

- Generación automática desde transacciones contables (modo Automático, trial-balance del mes/año seleccionados)
- Exportación a Excel (.xlsx)
- Exportación CSV/PDF y vista manual intactas

#### Lo que Falta

- ~~Sin generación automática desde contabilidad~~ ✅ Generación automática desde transacciones contables (toggle Manual/Automático en `app/companies/[id]/reports/sales-book/page.tsx`, 22 Sept 2026)
- ~~Sin exportación a Excel~~ ✅ Exportación a Excel (.xlsx) desde `lib/reports/sales-book.ts` + botón "Exportar Excel" en ambos modos (22 Sept 2026)

---

### 2.3 Formulario SAR 221 (ISV)

**Estado: Completo (100%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/accounting/SARForm221.tsx` | Cálculo de Débito Fiscal (Ventas casillas 401-405) y Crédito Fiscal (Compras casillas 501-505), impuesto a pagar o saldo a favor, botón de generar archivo DET |
| `components/accounting/AccountingBooks.tsx` | Pestaña SAR 221 integrada en visor de libros |
| `lib/reports/det-sar.ts` | DET automático desde transacciones contables (trial-balance): `transformToDET`, `validateAgainstSARRanges`, `formatDETForSAR` (filas de 262 caracteres) + `validateCompleteness` (completitud bloqueante/warnings) (f328c39, 22 Sept 2026) |

#### Capacidades

- Generación automática de DET desde transacciones contables (toggle Manual/Automático que trae el trial-balance del período y llena débito/crédito fiscal)
- Validación contra rangos SAR: cada documento dentro de `[rangoInicial..rangoFinal]` del CAI, sin duplicados, correlativo consecutivo, rango no agotado; `errors` (fuera de rango/duplicado) y `warnings` (salto, rango sin configurar, datos agregados sin número de documento)
- "Generar DET" no genera si hay errores de rango (avisa); con solo warnings genera avisando; descarga `.txt` (262 caracteres)
- Rangos desde `api/companies/{id}/cai` (modelo `cAIAuthorization`); sin rango configurado → warning claro, no rompe

#### Lo que Falta

- ~~Sin carga automática del DET al portal SAR~~ ✅ Carga automática al portal SAR mediante adaptador configurable (credenciales cifradas AES-256-GCM por empresa, endpoint configurable, POST autenticado con retry/timeout, clasificación de errores RED/CREDENCIALES/PORTAL/CONFIG — ver §2.4)

---

### 2.4 Exportación DET (SAR)

**Estado: Completo (100%)**
 
#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/DETExportManager.tsx` | Generación de archivos .txt formato SAR para declaraciones mensuales (compras/ventas/servicios/otros), validación contra especificación SAR, campo por campo |
| `lib/services/det-live-core.ts` | Especificación de formato SAR: registro de 262 caracteres, campos definidos (RTN, nombre, tipo/número/fecha documento, montos exento/gravado/impuesto/total) |
| `app/det/page.tsx` | Página de exportación DET |
| `app/api/det/route.ts` | API de generación DET |
| `lib/services/det-uploader.ts` | Adaptador de carga DET→SAR: submitDETToSARR (POST autenticado FormData + Basic, timeout 15s + retry), DETUploadResult con errorHint clasificado |

#### Lo que Falta

- ~~Sin carga automática a portal SAR~~ ✅ Carga automática al portal SAR mediante adaptador configurable (credenciales cifradas AES-256-GCM por empresa, endpoint configurable, POST autenticado con retry/timeout, clasificación de errores RED/CREDENCIALES/PORTAL/CONFIG)
- ~~Sin validación de completitud antes de generar~~ ✅ Validación de completitud antes de generar (bloqueante si faltan datos, warnings permisivos)

---

### 2.5 Retenciones

**Estado: Completo (100%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/WithholdingManager.tsx` | CRUD completo de retenciones: 1% y 12.5% en servicios profesionales, validación RTN, generación PDF con @react-pdf/renderer, estados (PENDIENTE/PAGADO/CANCELADO) |
| `lib/services/withholding-service.ts` | Servicio CRUD, cálculo, gestión de estados, seguimiento de períodos, validación RTN |
| `components/reports/WithholdingReceiptPDF.tsx` | Recibo PDF A4 con datos emisor, badge CAI, datos proveedor, tabla impuestos, firmas, leyenda legal SAR |
| `components/dashboard/WithholdingDashboard.tsx` | Dashboard de retenciones |
| `app/withholding/page.tsx` | Página de gestión |
| `app/api/withholding/route.ts` | API de retenciones |
| `app/api/withholding-statistics/route.ts` | API de estadísticas |
| `lib/reports/withholding-book.ts` | Libro de Retenciones automático: clasificación RETENCION/IR/ISR/IGV/OTRO, transform + grouping desde trial-balance, formato Excel (22 Sept 2026) |
| `app/companies/[id]/reports/withholding-book/page.tsx` | Página empresarial: toggle fuente Manual/Automática (contable) y exportación a Excel (22 Sept 2026) |
| `lib/services/withholding-entries.ts` | Asiento contable automático de retenciones: `buildWithholdingJournalEntry` (débito gasto/costo + crédito retención por pagar balanceado, montos base × tasa), clasificación IR/ISR/IGV/RETENCION, grouping + totales, formato Excel (23 Sept 2026) |
| `app/api/accounting/withholding-journal/route.ts` | API de asientos de retenciones: POST crea la póliza (vía `createJournalTransaction`, deduplicado por retención con errorHint DUPLICADO) y GET consulta el asiento generado (23 Sept 2026) |

#### Tablas de Base de Datos

- `Withholding` (Supabase) — type, invoiceNumber, invoiceDate, providerName, providerRTN, amount, withholdingRate, withholdingAmount, period, status, receiptNumber

#### Capacidades

- Generación automática desde transacciones contables (modo Automático, trial-balance del mes/año seleccionados)
- Asiento contable automático al guardar la retención (toggle ON/OFF en el manager, `WithholdingManager`): débito a cuenta de gasto/costo + crédito a cuenta pasiva de retención por pagar, balanceado, con "Ver asiento", "Generar asiento ahora" para retenciones previas y exportación Excel `Asientos_Retenciones_{empresa}_{año}-{mes}.xlsx` (23 Sept 2026)
- Exportación a Excel (.xlsx)
- Exportación CSV/PDF y vista manual intactas

#### Lo que Falta

- ~~Sin generación automática desde contabilidad~~ ✅ Generación automática desde transacciones contables (toggle Manual/Automático en `app/companies/[id]/reports/withholding-book/page.tsx`, 22 Sept 2026)
- ~~Sin exportación a Excel~~ ✅ Exportación a Excel (.xlsx) desde `lib/reports/withholding-book.ts` + botón "Exportar Excel" en ambos modos (22 Sept 2026)
- ~~**Sin integración con asientos contables** (retenciones no generan póliza automática)~~ ✅ Asiento contable automático balanceado (débito gasto/costo + crédito retención por pagar, montos base × tasa) al guardar/regenerar la retención, API `app/api/accounting/withholding-journal` + `lib/services/withholding-entries.ts` + exportación Excel de asientos (23 Sept 2026)
- Sin libro de retenciones anual consolidado

---

### 2.6 Cierre Anual

**Estado: Parcial (~50%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/YearEndClosing.tsx` | Wizard: revisión de balanza, asientos de ajuste, bloqueo de período |
| `app/closing/page.tsx` | Página de cierre |
| `app/api/closing/perform/route.ts` | Ejecución |
| `app/api/closing/trial-balance/route.ts` | Balanza para cierre |
| `app/api/closing/adjusting-entries/route.ts` | Asientos de ajuste |

#### Lo que Falta

- ~~Sin balance de apertura automático~~ ✅ Disponible vía `POST /api/accounting/opening-balances/auto` (traslado del cierre previo, 17 Sept 2026)
- Cierre mensual implementado en Contabilidad (ver `REGISTROS_CONTABLES_REPORT.md` §2.6); esta sección cubre solo el flujo anual
- ~~Sin reporte de variaciones~~ ✅ `/reports/period-variations` + API comparativa (17 Sept 2026)

---

### 2.7 Declaraciones Anuales

**Estado: Completo (~97%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/reports/annual-tax/page.tsx` | Página de Declaraciones Anuales: 3 tarjetas (ISV/ISR/Retenciones) con montos reales desde transacciones contables, selector de año, botón "Exportar a Excel" y conexión al portal SAR (configurar, probar conexión y subir declaraciones) (22-23 Sept 2026) |
| `lib/reports/annual-tax.ts` | Declaraciones Anuales automáticas: clasificación por prefijo de cuenta, transform + grouping desde trial-balance, cálculo ISV (débito − crédito fiscal efectivo), ISR 25% y retenciones (reusa `withholding-book.ts`), formato Excel multi-hoja |
| `lib/services/annual-tax-uploader.ts` | Adaptador de carga de Declaraciones Anuales → portal SAR: `submitAnnualTaxToSARR` (POST/PUT autenticado FormData + Basic, timeout 15s + retry, errorHint clasificado RED/CREDENCIALES/PORTAL/CONFIG) sobre credenciales cifradas AES-256-GCM + `validateAnnualTaxCompleteness` (errors bloqueantes / warnings permisivos) (23 Sept 2026) |
| `app/api/accounting/annual-tax-upload/route.ts` | API de conexión SAR de declaraciones anuales: `get-config`, `save-config` (cifra credenciales por empresa en `system_settings` clave `annual_tax_sar_config:{empresa}`), `test` (round-trip de credenciales) y `upload` (validateAnnualTaxCompleteness → si hay errors NO envía y devuelve `validationErrors`; solo warnings envía + `warnings`; éxito devuelve `summaryPreview` con los montos reales enviados) (23 Sept 2026) |

#### Capacidades

- Generación automática desde transacciones contables (trial-balance del ejercicio: 1 ene → 31 dic) al cargar la página o cambiar el año
- ISV: débito fiscal (ventas) − crédito fiscal (compras) mediante el ISV efectivo de las transacciones → impuesto a pagar o saldo a favor
- ISR: ingresos gravados (REVENUE) − deducciones (EXPENSE 5/6xxx) × tarifa corporativa 25%
- Retenciones: misma clasificación/agrupación que `lib/reports/withholding-book.ts` sobre balances de cuentas LIABILITY de retención
- Exportación a Excel (.xlsx) con 3 hojas (ISV/ISR/Retenciones), nombre `Declaraciones_Anuales_{empresa}_{año}.xlsx`
- Conexión al portal SAR por empresa (endpoint configurable http(s), credenciales cifradas AES-256-GCM con `SAR_ENC_KEY`, método POST/PUT, periodo y tipo de declaración configurados, guardado en `system_settings` como `annual_tax_sar_config:{empresa}`)
- Carga automática al portal SAR: `submitAnnualTaxToSARR` envía rtn, nombreDelContribuyente, periodo (año), formulario, totalISV_impuestoAPagar_o_saldoAFavor, baseISR, tasaISR (25), impuestoISR y retenciones_totales; con retry/timeout y clasificación de errores RED/CREDENCIALES/PORTAL/CONFIG
- Validación previa de completitud (`validateAnnualTaxCompleteness`): errors bloquean la subida (falta RTN/nombre del emisor, base ISV/ISR o montos de retenciones); warnings (montos en cero) no bloquean — solo avisan y la declaración se sube igual

#### Lo que Falta

- ~~Datos reales pendientes~~ ✅ Conectado a datos reales desde transacciones contables + exportación Excel (22 Sept 2026)
- ~~Sin envío en línea al portal SAR~~ ✅ Carga automática al portal SAR (adaptador configurable `lib/services/annual-tax-uploader.ts` + API `app/api/accounting/annual-tax-upload/route.ts`, validación de completitud previa y conexión configurable con credenciales cifradas AES-256-GCM, 23 Sept 2026)

---

### 2.8 Libro Mayor y Libro Diario

**Estado: Completo (~95%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/reports/general-ledger.ts` | Libro Mayor y Libro Diario automáticos: clasificación ACTIVO/PASIVO/PATRIMONIO/INGRESO/GASTO por prefijo de cuenta (1-7xxx), transform + grouping desde trial-balance, formato Excel (23 Sept 2026) |
| `app/companies/[id]/reports/general-ledger/page.tsx` | Página empresarial: toggle fuente Manual/Automática (contable), toggle de tipo de libro Mayor/Diario y exportación a Excel (23 Sept 2026) |

#### Capacidades

- Libro Mayor: agrupa por cuenta a nivel trial-balance (código, nombre, tipo, débito, crédito, saldo)
- Libro Diario: desglose por asiento/transacción si el trial-balance trae el nivel de journalEntry; si no, agrupa por cuenta (fallback seguro, nunca rompe)
- Generación automática desde transacciones contables (modo Automático, trial-balance del mes/año seleccionados)
- Exportación a Excel (.xlsx) en ambos tipos (`Libro_Mayor_{empresa}_{año}-{mes}.xlsx` / `Libro_Diario_{empresa}_{año}-{mes}.xlsx`)
- Exportación CSV/print y vista manual intactas en ambos tipos

---

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | ~~Sin DIAT~~ | ~~Incumplimiento SAR~~ | ✅ Implementado (16 Sept 2026) |
| 2 | ~~Retenciones sin asiento contable~~ | ~~Duble registro manual~~ | ✅ Resuelto (asiento automático balanceado, débito gasto + crédito retención por pagar, 23 Sept 2026) |
| 3 | Libros sin generación automática desde contabilidad | Dependencia de carga manual | Alta |
| 4 | ~~Sin declaraciones anuales consolidadas~~ | ~~Incumplimiento fiscal~~ | ✅ Implementado (conectado a datos reales desde transacciones contables + exportación Excel, 22 Sept 2026) |
| 5 | ~~DET sin carga automática a SAR~~ | ~~Proceso manual~~ | ✅ Implementado (adaptador configurable de carga DET→SAR, 22 Sept 2026) |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Integración Contable de Retenciones

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 1.1 | ~~Crear asiento contable automático al registrar retención~~ | ~~`lib/services/withholding-service.ts`~~ | ✅ Asiento automático balanceado (`lib/services/withholding-entries.ts` + `app/api/accounting/withholding-journal/route.ts`, toggle en `WithholdingManager`, exportación Excel de asientos; 23 Sept 2026) |
| 1.2 | Generar libro de retenciones anual | `components/legal/WithholdingBook.tsx` | Libro anual |
| 1.3 | Integrar retenciones con balanza de comprobación | `lib/reports/trial-balance.ts` | Retenciones en balanza |

### Etapa 2: Generación Automática de Libros

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 2.1 | Auto-generar Libro de Ventas desde transacciones | `lib/services/books-generator.ts` | Generación automática |
| 2.2 | Auto-generar Libro de Compras desde transacciones | `lib/services/books-generator.ts` | Generación automática |
| 2.3 | Validación de completitud antes de generar DET | `lib/services/det-live-core.ts` | Validaciones ✅ |

### Etapa 3: DIAT y Declaraciones (DIAT ✅)

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 3.1 | ~~Crear generador de DIAT~~ | ~~`lib/services/diat-generator.ts`~~ | ✅ Generador DIAT (16 Sept 2026) |
| 3.2 | ~~UI para DIAT~~ | ~~`app/diat/page.tsx`~~ → `app/companies/[id]/diat/page.tsx` + `components/DIATManager.tsx` | ✅ Página DIAT + API (16 Sept 2026) |
| 3.3 | Declaración anual consolidada | `app/reports/annual-tax/page.tsx` | Reporte anual ✅ Implementado (datos reales desde transacciones contables + exportación Excel, 22 Sept 2026) |

### Etapa 4: Exportación y Cumplimiento

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 4.1 | Exportación Excel para libros legales | `lib/services/excel-export.ts` | Exportación .xlsx |
| 4.2 | PDF profesional para libros | `lib/services/pdf-export.ts` | PDFs con formato SAR |
| 4.3 | Dashboard de cumplimiento fiscal | `app/compliance/page.tsx` | Dashboard |

### Etapa 5: QA

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 5.1 | Pruebas de cálculos de ISV y retenciones | `__tests__/tax/` | Pruebas unitarias |
| 5.2 | Pruebas E2E de libros legales | `__tests__/e2e/legal/` | Pruebas E2E |

---

## 5. Diagrama de Dependencias

```
Etapa 1 (Retenciones + Contabilidad)
    ├── Etapa 2 (Libros Automáticos)
    │       └── Etapa 3 (DIAT)
    └── Etapa 4 (Exportación + Cumplimiento)
            └── Etapa 5 (QA)
```

---

## 6. Estimación de Esfuerzo

| Etapa | Tareas | Complejidad | Estimación |
|---|---|---|---|
| Etapa 1: Retenciones | 3 tareas | Media | 1-2 semanas |
| Etapa 2: Libros | 3 tareas | Alta | 2-3 semanas |
| Etapa 3: DIAT (✅ hecho) y Declaraciones | 1 tarea | Media | 1 semana |
| Etapa 4: Exportación | 3 tareas | Media | 1-2 semanas |
| Etapa 5: QA | 2 tareas | Media | 1 semana |
| **Total** | **12 tareas** | — | **6-10 semanas** |

---

## Actualizaciones de Libros Legales (16 Sept 2026)

| Cambio | Detalle |
|---|---|
| DIAT implementado | Generador `lib/services/diat-generator.ts` + API `app/api/diat/route.ts` + UI `/companies/[id]/diat` (`components/DIATManager.tsx`) |
| Fuentes | Ventas `libro_ventas` (hoy sin registros), compras `Purchase`; declarante `companies` |
| Notas de Crédito/Débito (NC/ND) | `lib/services/notes-service.ts` + API `/api/billing/notes[/id]` + UI `/billing/notes`; las notas NO consumen CAI propio, referencian el CAI de la factura original (SAR-HN); numeración interna NC-/ND- por tenant |
| Asiento contable de notas | `postNoteJournal` genera asiento AJUSTE balanceado (4101 / 2105 + contra 1101 / 1103, ISV 15% incluido); best-effort (no bloquea la emisión) |
| Consolidación de esquema | Vistas `libro_ventas`/`libro_compras` recreadas sobre la tabla canónica `Invoice` (migración 007, 16 Sept 2026) |

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 16.3.5 | Restaurado desde 15.5.25; build y dev OK en Vercel (16 Sept 2026) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |

## Actualizaciones de Libros Legales (21 Sept 2026)

| Cambio | Detalle |
|---|---|
| Tab "Plantillas" de importación | `app/companies/[id]/accounting/page.tsx` ofrece 6 templates Excel descargables (`libro_diario`, `libro_mayor`, `libro_compras`, `libro_ventas`, `egresos_personalizado`, `ingresos_personalizado`) con el formato exacto para cargar libros |
| Uploader sin descargas | `components/accounting/ExcelBooksUploader.tsx` ya no incluye botones de descarga de templates (se consolidaron en la tab "Plantillas"); conserva la lista "Formatos soportados" |
| Declaraciones Anuales | Página `/reports/annual-tax` (ISV/ISR/Retenciones) compilada, commiteada y desplegada en producción; siguiente paso: conectar datos reales |
| Despliegue | Producción `app.contabhn.com` actualizada (commits `a80e6ea`, `b69025a`) |

## Actualizaciones de Libros Legales (22 Sept 2026)

| Cambio | Detalle |
|---|---|
| Libro de Compras automático | `lib/reports/purchase-book.ts` (clasificación COMPRA/GASTO/IMPUESTO/OTRO, transform + grouping desde trial-balance, formato Excel) + integración en `app/companies/[id]/reports/purchase-book/page.tsx` con toggle Manual/Automático (transacciones contables) y exportación a Excel |
| Libro de Ventas automático | `lib/reports/sales-book.ts` (clasificación VENTA/INGRESO/IMPUESTO/OTRO, transform + grouping desde trial-balance, formato Excel) + integración en `app/companies/[id]/reports/sales-book/page.tsx` con toggle Manual/Automático (transacciones contables) y exportación a Excel |
| Formulario SAR 221 / DET | Completado al 100%: validación de completitud previa + carga automática al portal SAR (adaptador configurable, credenciales cifradas AES-256-GCM) — commit d42614a (22 Sept 2026) |

## Actualizaciones de Libros Legales (23 Sept 2026)

| Cambio | Detalle |
|---|---|
| Libro de Retenciones automático | `lib/reports/withholding-book.ts` (clasificación RETENCION/IR/ISR/IGV/OTRO, transform + grouping desde trial-balance, formato Excel) + integración en `app/companies/[id]/reports/withholding-book/page.tsx` con toggle Manual/Automático (transacciones contables) y exportación a Excel |
| Retenciones → asiento contable automático balanceado | `lib/services/withholding-entries.ts` (`buildWithholdingJournalEntry`: débito gasto/costo + crédito retención por pagar, montos base × tasa, balanceado) + API `app/api/accounting/withholding-journal/route.ts` (POST crea póliza vía `createJournalTransaction` con deduplicado DUPLICADO, GET consulta el asiento) + toggle "Asiento automático ON/OFF" en `components/WithholdingManager.tsx` con "Ver asiento"/"Generar asiento ahora" y exportación Excel `Asientos_Retenciones_{empresa}_{año}-{mes}.xlsx` |
| Libro Mayor y Libro Diario automáticos | `lib/reports/general-ledger.ts` (clasificación ACTIVO/PASIVO/PATRIMONIO/INGRESO/GASTO por prefijo de cuenta, transform + grouping desde trial-balance, formatos Excel de Mayor y Diario) + integración en `app/companies/[id]/reports/general-ledger/page.tsx` con toggle Manual/Automático (transacciones contables), toggle Mayor/Diario y exportación a Excel |
| Declaraciones Anuales conectadas a datos reales | `lib/reports/annual-tax.ts` (cálculo ISV/ISR/Retenciones desde transacciones contables + formato Excel multi-hoja) + integración en `app/reports/annual-tax/page.tsx` con 3 tarjetas de montos reales, selector de año y botón "Exportar a Excel" (22 Sept 2026) |
