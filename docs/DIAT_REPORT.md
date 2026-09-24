# Reporte del Módulo DIAT (Declaración Informativa de Actividades)

> **Fecha:** 17 de Septiembre de 2026
> **Última actualización:** 23 de Septiembre de 2026
> **Proyecto:** Contab - Sistema Contable Honduras
> **Estado:** Completo (función en producción + carga automática al portal SAR)

## 1. Resumen Ejecutivo

El módulo **DIAT** genera la declaración mensual informativa de actividades por empresa: consolida las **ventas** y **compras** registradas en un período determinado, las agrupa por tasa fiscal (0%, 15%, 18% y otras) y presenta el detalle por CAI (ventas) y por proveedor (compras), junto con el resumen de liquidación (impuesto generado, crédito fiscal, ISV a pagar).

Es un reporte informativo mensual (periodos `AAAA-MM`) por empresa. En Honduras la DIAT opera como declaración informativa complementaria al DET/DMC. El módulo exporta a **CSV** e **impresión** desde la UI y, desde el **23 de Septiembre de 2026**, permite **conectarse al portal SAR y subir la DIAT de forma automática y cifrada** (credenciales AES-256-GCM por empresa, endpoint configurable, validación de completitud previa y código de seguimiento).

| Sub-Área | Estado | UI Pages | API Routes | Almacenamiento |
|---|---|---|---|---|
| **DIAT (generación)** | Completo | 1 página | 1 ruta | Supabase (tablas existentes) |
| **DIAT → carga automática al portal SAR** | Completo (23 Sept 2026) | `components/DIATManager.tsx` | 1 ruta (`app/api/accounting/diat-upload/route.ts`) | Supabase (`system_settings` — config cifrada y último envío) |

## 2. Arquitectura

| Archivo | Propósito |
|---|---|
| `lib/services/diat-generator.ts` | Lógica del generador: periodos disponibles, construcción del reporte, clasificación por tasa, resumen y liquidación |
| `app/api/diat/route.ts` | API REST `GET /api/diat` |
| `app/companies/[id]/diat/page.tsx` | Página de la empresa (`/companies/[id]/diat`) |
| `lib/services/diat-uploader.ts` | Adaptador de carga DIAT→SAR: `submitDiatToSARR` (POST autenticado con FormData + Basic, timeout/retry, clasificación SUCCESS/CREDENCIALES/RED/PORTAL/CONFIG, `extractTrackingCode`), `validateDiatCompleteness` (errors bloqueantes / warnings permisivos) y config cifrada AES-256-GCM (reutiliza el cifrado de `det-uploader`, sin duplicar) — 23 Sept 2026 |
| `app/api/accounting/diat-upload/route.ts` | API de conexión SAR: `get-config`, `save-config` (cifra credenciales por empresa en `system_settings` clave `diat_sar_config:{empresa}`), `test` y `upload` (valida completitud contra `validateDiatCompleteness`; con errors NO envía y devuelve `validationErrors`; éxito devuelve código de seguimiento y guarda el último envío en `diat_sar_last_upload:{empresa}`; HTTP SUCCESS 200 / CREDENCIALES 401 / RED 502 / PORTAL 503 / CONFIG 500) — 23 Sept 2026 |
| `components/DIATManager.tsx` | UI cliente (componente reactivo por empresa/período): generación, CSV/impresión, "Conectar al portal SAR" y "Subir DIAT al portal SAR" con sesión única verificada (ver §6.3) |

La UI (`DIATManager`) no importa el servicio del servidor; el CSV se construye en el cliente a partir de los datos del reporte. La subida al portal SAR pasa por la sesión única verificada de `lib/services/sar-session.ts` (sin sesión `CONECTADO` no envía, `SESION_NO_VERIFICADA`).

### Flujo

```
UI (/companies/[id]/diat)  →  GET /api/diat?companyId=&period=
                                   │
                            lib/services/diat-generator.ts
                                   │
              ┌────────────────────┼────────────────────┐
       companies           libro_ventas             Purchase
   (declarante)            (ventas)                 (compras + proveedor)
```

## 3. API REST

### `GET /api/diat?companyId=<id|tenant_id>&period=<AAAA-MM>`

**Respuesta `200 OK`:**
```json
{
  "success": true,
  "data": {
    "companyId": "ANGELOH7",
    "availablePeriods": ["2026-09"],
    "report": {
      "period": "2026-09",
      "declarante": { "nombre": "Angelos", "rtn": "05011991078001", "domicilio": "...", "regimen": "..." },
      "ventas": { "source": "libro_ventas", "records": [], "totals": { "gravadas15": 0, "isv15": 0, "total": 0 } },
      "compras": {
        "source": "purchase",
        "records": [ { "factura": "...", "fecha": "2026-09-03", "proveedor": "...", "rtn": "...", "base": 119, "isv": 18, "total": 137, "rate": 15 } ],
        "totals": { "gravadas15": 538, "isv15": 81, "exentas": 0, "total": 619 }
      },
      "resumen": { "operaciones": 2, "creditoFiscal": 81, "isvAPagar": -81 },
      "generatedAt": "..."
    }
  }
}
```

**Errores:**
- `400` — falta `companyId`
- `400` — período inválido (no cumple `^\d{4}-(0[1-9]|1[0-2])$`, p.ej. `2026-13`)
- `404` — período sin datos: la empresa **no tiene ningún dato** en `Purchase`/`libro_ventas`/`libro_compras`. Si hay datos en otros meses pero el período pedido está vacío → `200` con reporte vacío.

**Periodos disponibles** (`availablePeriods`): meses derivados de las fechas de `Purchase`, `libro_ventas` y `libro_compras` del tenant; si no hay registros, se devuelve el mes actual. Para la ventana del reporte se usa `getAvailableDiatPeriods(companyId)`.

## 4. Fuentes de Datos

| Fuente | Tabla | Uso |
|---|---|---|
| Declarante | `companies` | Resuelto por `tenant_id` = `companyId` (fallback: `id` = `companyId`): nombre, RTN, domicilio, régimen |
| Ventas | `libro_ventas` | Documentos de venta por tenant/período (`invoice_date`, `total`, `cai`); agrupación por CAI |
| Compras | `Purchase` | Compras por `tenant_id='1'` + `company_id`; proveedor (nombre, RTN) embebido; agrupación por proveedor |

**Reglas de agregación:**
- Clasificación por `tax_rate`: **15%**, **18%**, **0%/exenta**, **otras**.
- Las compras **canceladas** se excluyen del reporte.
- Si la consulta de ventas por tenant falla, se reintenta con consulta global por período (sin filtro de tenant) para no perder datos.

## 5. Funcionalidad de la UI (`/companies/[id]/diat`)

- Tarjeta del **declarante** (nombre, RTN, domicilio, régimen tributario).
- Selector de **período** (desde `availablePeriods`).
- KPIs: Ventas (no. documentos, total), Compras (no. documentos, base gravada 15%, ISV 15%, total), Liquidación (crédito fiscal, ISV a pagar).
- Tabla de **ventas** agrupada por **CAI** (monto exento, base 15%, ISV 15%, base 18%, total).
- Tabla de **compras** agrupada por **proveedor** (base 15%, ISV 15%, base 18%, totales).
- **Exportar CSV** (cliente) y **Imprimir** (`window.print()`, contenido con `id="diat-content"`).
- **Conectar al portal SAR** y **Subir DIAT al portal SAR** (23 Sept 2026): validación de completitud en pantalla (lista roja bloquea la subida; warnings amarillos permiten enviar igualmente), envío por la sesión única verificada y estado/enlace con **código de seguimiento** devuelto por el portal.

## 6. Verificación E2E (dev server + Supabase real)

- `GET /api/diat?companyId=ANGELOH7` → `200`, `availablePeriods: ["2026-09"]`.
- Reporte `period=2026-09` → declarante "Angelos" resuelto; ventas `source=ninguna` (0 registros, `libro_ventas` vacío); compras: 2 registros (proveedor "Distrubidora Comercial SA", RTN `0801-19002-2783-1`), totales `base=538`, `ISV=81`, `total=619`; resumen `operaciones=2`, `creditoFiscal=81`, `isvAPagar=-81`.
- Sin `companyId` → `400`.
- `period=2026-13` → `400` (validación regex aplicada).
- `period=2026-08` → `200` con reporte vacío.
- Empresa sin datos con `period` provisto → `404` (error "No hay datos para el período solicitado").
- Página `/companies/ANGELOH7/diat` → `200`.
- `pnpm build` → `EXIT=0`.

## 6.1 Pruebas Automatizadas

Runner nativo de Node (`node:test`, sin dependencias nuevas). Mockea el servicio Supabase (`@/lib/services/diat-generator`) y `next/server` con un loader ESM, e importa el handler real `app/api/diat/route.ts`.

```bash
npm test
```

Cubre:

- `400` — falta `companyId`.
- `400` — período inválido (`2026-13`, `2026-00`, `2026-1`, `abc`, `2026/09`).
- `200` — período válido con datos.
- `200` — período sin datos devuelve reporte vacío.
- `200` — sin `period` devuelve `report: null` + `availablePeriods`.
- `404` — período sin datos: la empresa no tiene ningún dato.

Archivos: `tests/diat/diat-route.test.mjs`, `tests/diat/loader.mjs`, `tests/diat/register.mjs`, `tests/diat/diat-generator-mock.mjs`, `tests/diat/next-server-stub.mjs`.

## 6.2 Comparativo fiscal entre períodos (17 Sept 2026)

- `getDiatVariations` en `diat-generator.ts` (resúmenes de dos meses) + `GET /api/diat/variations?companyId=&from=&to=` (400 validación, 404 sin datos).
- `buildDiatDelta` en `lib/services/diat-delta.ts` (puro): 8 métricas (operaciones, facturas, ventas, ISV ventas, compras, ISV compras, crédito fiscal, ISV a pagar) con variación absoluta y porcentual.
- UI en `DIATManager`: selector "vs", botón Comparar y tabla de métricas.
- Tests en `tests/diat-variations/` (delta + ruta); `npm test` → 90 pass.

## 6.3 Conexión y carga automática al portal SAR (23 Sept 2026)

- `lib/services/diat-uploader.ts`: `submitDiatToSARR` (POST autenticado FormData + Basic, timeout 15s + retry, clasificación SUCCESS/CREDENCIALES/RED/PORTAL/CONFIG) sobre credenciales cifradas AES-256-GCM; `extractTrackingCode` lee el código de seguimiento de la respuesta del portal; `validateDiatCompleteness` valida pre-upload (RTN/razón social del declarante y datos del período; errors bloquean, warnings solo avisan).
- `app/api/accounting/diat-upload/route.ts`: operaciones `get-config`/`save-config`/`test`/`upload`; la config por empresa queda cifrada en `system_settings` (`diat_sar_config:{empresa}`) y el último envío en `diat_sar_last_upload:{empresa}`; mapeo HTTP: SUCCESS 200 / CREDENCIALES 401 / RED 502 / PORTAL 503 / CONFIG 500.
- La subida exige la **sesión única verificada al portal SAR** (compartida con Anuales y DET-SAR 221): sin sesión `CONECTADO` envía `SESION_NO_VERIFICADA` y no sube (`getLiveSARSession` + `isSARSessionValid` en la ruta, ver `docs/INTEGRACION_FISCAL_REPORT.md` §6.3).

## 7. Limitaciones y Pendientes

- **`libro_ventas` sin registros**: PENDIENTE (datos, no código): los datos de ventas hoy devuelven 0 (verificado en E2E de la sección §6: `ventas source=ninguna`, 0 registros, `libro_ventas` vacío); al poblarse el libro, el reporte y la DIAT subida reflejarán las ventas reales del período.
- **Dome del proveedor**: la UI usa el RTN del proveedor; el total del proveedor incluye todas sus compras del período.
- **Regímenes**: el campo de régimen tributario puede traer texto con caracteres no deseados según los datos de origen (ej.: "RAcgimen General" por datos cargados).
- ~~Envío en línea a SAR~~ ✅ Implementado (23 Sept 2026): carga automática cifrada al portal SAR con validación de completitud previa y código de seguimiento (commit `f590680`, sesión única `e50d617`).

## 8. Archivos Relacionados

- `lib/supabase/server-lazy.ts` — cliente `getSupabaseServer()`
- `lib/purchase-db.ts` — `TENANT_ID='1'`, `fetchPurchases`, `transformPurchase`
- `app/companies/[id]/page.tsx` — tarjeta de acceso rápido al módulo DIAT
- Contra-flujo fiscal: `app/api/det/route.ts` y `components/DETExportManager.tsx` (mismo envelope `{success, data}`)

## Actualizaciones de DIAT (23 Sept 2026)

| Cambio | Detalle |
|---|---|
| Conexión y carga automática al portal SAR | `lib/services/diat-uploader.ts` (`submitDiatToSARR` POST autenticado FormData + Basic + timeout/retry, clasificación SUCCESS/CREDENCIALES/RED/PORTAL/CONFIG, `extractTrackingCode` y `validateDiatCompleteness` errors bloqueantes/warnings permisivos; reutiliza el cifrado AES-256-GCM de `det-uploader` sin duplicar) + `app/api/accounting/diat-upload/route.ts` (`get-config`/`save-config`/`test`/`upload`, config cifrada en `system_settings` clave `diat_sar_config:{empresa}` y último envío en `diat_sar_last_upload:{empresa}`) + botones "Conectar al portal SAR" y "Subir DIAT al portal SAR" en `components/DIATManager.tsx` (validación en pantalla, estado de envío es-HN con código de seguimiento) — commit `f590680` |
| Sesión única verificada al portal SAR | La subida DIAT pasa por `lib/services/sar-session.ts` + `app/api/accounting/sar-session/route.ts` + `components/accounting/SARSessionPanel.tsx` (credenciales validadas en vivo contra el portal, sesión cifrada compartida con Anuales y DET-SAR 221, auto-reverificación al vencer, logout; sin sesión `CONECTADO` → `SESION_NO_VERIFICADA` y no se envía) — commit `e50d617` |
| Fix integración libros-legales | `app/api/accounting/trial-balance-detailed/route.ts` y `app/companies/[id]/reports/general-ledger/page.tsx` alinean el Libro Diario con pólizas reales por fecha/referencia (voucherNumber); sin efecto en rutas DIAT — commit `af42c46` |