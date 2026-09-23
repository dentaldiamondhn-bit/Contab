# Reporte de Estado y Plan de Ejecución: Libros Legales

> **Nota:** Este módulo ha sido combinado con "Registros Contables" y "Estados Financieros" en un solo módulo "Contabilidad". Ver `MASTER_REPORT.md` para el estado unificado.

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables/Vistas | Almacenamiento |
|---|---|---|---|---|---|
| **Libro de Compras** | Completo | 1 página | 1 ruta | 1 vista | Supabase |
| **Libro de Ventas** | Completo | 1 página | 1 ruta | 1 vista | Supabase |
| **Libro de Inventarios y Balances** | Completo | 1 página | — | 1 vista | Supabase |
| **Formulario SAR 221 (ISV)** | Completo | 1 componente | — | — | Cálculos en código |
| **Exportación DET (SAR)** | Completo | 1 componente | 1 ruta | — | Generación archivo .txt |
| **Retenciones** | Completo | 1 página | 1 ruta | 1 tabla | Supabase + Prisma |
| **ISV (Impuesto Sobre Ventas)** | Parcial | 1 página | 2 rutas | Config en Prisma | Supabase + Prisma |
| **Cierre Anual** | Parcial | 1 página | 3 rutas | Config | Prisma |
| **DIAT** | Completo | 1 página | 1 ruta | — | Supabase (libro_ventas, Purchase, companies) |
| **Declaraciones Anuales** | ✅ En progreso | `app/reports/annual-tax/page.tsx` (21 Sept 2026: página + rutas compiladas y desplegadas; datos reales pendientes) | API | Datos reales | Generación automática |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~72% | Libros, SAR 221 y DIAT fuertes; Declaraciones Anuales en desarrollo |
| Cobertura de Pruebas | 0% | No existen pruebas |
| Exportación | ~50% | CSV y DET; sin Excel ni PDF profesional |
| Cumplimiento SAR | ~65% | Formulario 221, DET y DIAT listos; sin envío en línea |
| Integración Contable | ~40% | Retenciones sin asiento contable automático |

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

**Estado: Completo (~85%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/legal/SalesBook.tsx` | Libro de Ventas: carga de vista `libro_ventas`, filtros, CSV/PDF, totales de débito fiscal, DF pendiente |
| `app/api/reports/libro-ventas/route.ts` | API de datos |

#### Vista de Supabase

- `libro_ventas` — Desde tabla Invoice (invoicetype='CUSTOMER'), muestra datos fiscales

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

**Estado: Completo (~80%)**

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

#### Tablas de Base de Datos

- `Withholding` (Supabase) — type, invoiceNumber, invoiceDate, providerName, providerRTN, amount, withholdingRate, withholdingAmount, period, status, receiptNumber

#### Lo que Falta

- **Sin integración con asientos contables** (retenciones no generan póliza automática)
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

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | ~~Sin DIAT~~ | ~~Incumplimiento SAR~~ | ✅ Implementado (16 Sept 2026) |
| 2 | Retenciones sin asiento contable | Duble registro manual | Alta |
| 3 | Libros sin generación automática desde contabilidad | Dependencia de carga manual | Alta |
| 4 | Sin declaraciones anuales consolidadas | Incumplimiento fiscal | Alta | ✅ En desarrollo - `app/reports/annual-tax/page.tsx` (página + API compiladas y desplegadas 21 Sept 2026) |
| 5 | ~~DET sin carga automática a SAR~~ | ~~Proceso manual~~ | ✅ Implementado (adaptador configurable de carga DET→SAR, 22 Sept 2026) |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Integración Contable de Retenciones

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 1.1 | Crear asiento contable automático al registrar retención | `lib/services/withholding-service.ts` | Asiento automático |
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
| 3.3 | Declaración anual consolidada | `app/reports/annual-tax/page.tsx` | Reporte anual ✅ En desarrollo (página desplegada 21 Sept 2026) |

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
| Formulario SAR 221 / DET | Completado al 100%: validación de completitud previa + carga automática al portal SAR (adaptador configurable, credenciales cifradas AES-256-GCM) — commit d42614a (22 Sept 2026) |
