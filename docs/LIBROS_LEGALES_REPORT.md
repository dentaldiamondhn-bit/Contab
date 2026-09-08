# Reporte de Estado y Plan de Ejecución: Libros Legales

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
| **DIAT** | No Iniciado | 0 | 0 | 0 | — |
| **Declaraciones Anuales** | No Iniciado | 0 | 0 | 0 | — |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~65% | Libros y SAR 221 fuertes; faltan DIAT y declaraciones anuales |
| Cobertura de Pruebas | 0% | No existen pruebas |
| Exportación | ~50% | CSV y DET; sin Excel ni PDF profesional |
| Cumplimiento SAR | ~60% | Formulario 221 y DET listos; sin DIAT ni envío en línea |
| Integración Contable | ~40% | Retenciones sin asiento contable automático |

---

## 2. Inventario Detallado

### 2.1 Libro de Compras

**Estado: Completo (~85%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/legal/PurchaseBook.tsx` | Libro de Compras: carga de vista `libro_compras`, filtros por rango de fechas, exportación CSV/PDF, totales de monto, crédito fiscal, CF pendiente, info fiscal SAR |
| `app/reports/libros-compras-ventas/page.tsx` | Página de libros de compra/venta |
| `app/api/reports/libro-compras/route.ts` | API de datos |

#### Vista de Supabase

- `libro_compras` — Desde tabla Invoice (invoicetype='EXPENSE'), muestra número, fecha, proveedor, RTN, subimpuesto, total

#### Lo que Falta

- Sin exportación Excel
- Sin generación automática desde transacciones contables

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

**Estado: Completo (~80%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/accounting/SARForm221.tsx` | Cálculo de Débito Fiscal (Ventas casillas 401-405) y Crédito Fiscal (Compras casillas 501-505), impuesto a pagar o saldo a favor, botón de generar archivo DET |
| `components/accounting/AccountingBooks.tsx` | Pestaña SAR 221 integrada en visor de libros |

#### Lo que Falta

- Sin generación automática de DET desde datos de transacciones
- Sin validación contra rangos SAR

---

### 2.4 Exportación DET (SAR)

**Estado: Completo (~75%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/DETExportManager.tsx` | Generación de archivos .txt formato SAR para declaraciones mensuales (compras/ventas/servicios/otros), validación contra especificación SAR, campo por campo |
| `lib/services/det-live-core.ts` | Especificación de formato SAR: registro de 262 caracteres, campos definidos (RTN, nombre, tipo/número/fecha documento, montos exento/gravado/impuesto/total) |
| `app/det/page.tsx` | Página de exportación DET |
| `app/api/det/route.ts` | API de generación DET |

#### Lo que Falta

- Sin carga automática a portal SAR
- Sin validación de completitud antes de generar

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

- Sin balance de apertura automático
- Sin cierre mensual (solo anual)
- Sin reporte de variaciones

---

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | Sin DIAT | Incumplimiento SAR | Crítica |
| 2 | Retenciones sin asiento contable | Duble registro manual | Alta |
| 3 | Libros sin generación automática desde contabilidad | Dependencia de carga manual | Alta |
| 4 | Sin declaraciones anuales consolidadas | Incumplimiento fiscal | Alta |
| 5 | DET sin carga automática a SAR | Proceso manual | Media |

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
| 2.3 | Validación de completitud antes de generar DET | `lib/services/det-live-core.ts` | Validaciones |

### Etapa 3: DIAT y Declaraciones

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 3.1 | Crear generador de DIAT | `lib/services/diat-generator.ts` | Generador DIAT |
| 3.2 | UI para DIAT | `app/diat/page.tsx` | Página DIAT |
| 3.3 | Declaración anual consolidada | `app/reports/annual-tax/page.tsx` | Reporte anual |

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
| Etapa 3: DIAT | 3 tareas | Alta | 2-3 semanas |
| Etapa 4: Exportación | 3 tareas | Media | 1-2 semanas |
| Etapa 5: QA | 2 tareas | Media | 1 semana |
| **Total** | **14 tareas** | — | **7-11 semanas** |

---

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 15.5.25 | Downgraded desde 16.x (bug de Turbopack con .nft.json en Vercel) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |
