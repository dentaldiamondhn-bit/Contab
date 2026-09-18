# Reporte del Módulo: Notas de Crédito/Débito (fiscal SAR)

> **Fecha:** 17 de Septiembre de 2026
> **Proyecto:** Contab - Sistema Contable Honduras
> **Estado:** Completo (funcional, `pnpm build` EXIT=0)

## 1. Resumen Ejecutivo

El submódulo de **Notas de Crédito/Débito** permite emitir documentos de ajuste fiscal sobre facturas emitidas: la nota de **crédito** restituye montos al cliente (devoluciones, descuentos, anulaciones parciales de venta) y la nota de **débito** cobra montos adicionales sobre la factura (intereses, diferencia de precios, recargos). Resuelve el item crítico de Facturación y Ventas y se integra a la contabilidad generando un **asiento de tipo AJUSTE balanceado** con ISV 15% incluido.

Fiscalmente, las notas **NO consumen CAI propio**: referencian el **CAI de la factura original** conforme a la normativa SAR-HN. La numeración es interna por tenant con series independientes **NC-XXXXXXXX** y **ND-XXXXXXXX**. El documento resultado de la emisión es imprimible (documento fiscal) para entrega al cliente.

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Notas de Crédito/Débito** | Completo | 1 página (+ botón en `/billing`) | 2 rutas | 1 tabla (`InvoiceNote`) | Supabase |
| **Asiento contable (AJUSTE)** | Completo | — | — | 2 tablas (`Transaction`, `JournalEntry`) | Prisma |

## 2. Arquitectura

| Archivo | Propósito |
|---|---|
| `lib/services/notes-service.ts` | Lógica de negocio: resolución de tenant, numeración consecutiva, listado/detalle, creación, asiento contable y cambio de estado |
| `app/api/billing/notes/route.ts` | API REST: `GET` (lista con filtros) y `POST` (crear, requiere auth Clerk) |
| `app/api/billing/notes/[id]/route.ts` | API REST: `GET` (una nota) y `PATCH` (`{status}` Aplicar/Anular, requiere auth Clerk) |
| `components/billing/NoteForm.tsx` | Formularios `CreditNoteForm` / `DebitNoteForm` (Dialog) |
| `components/billing/NotePreview.tsx` | Documento fiscal imprimible (cliente) con `window.print()` |
| `app/billing/notes/page.tsx` | Página de gestión: stats, filtros, crear/aplicar/anular/ver |
| `app/billing/page.tsx` | Botón de acceso "Notas de Crédito/Débito" |

### Flujo

```
UI (/billing/notes)  →  GET/POST /api/billing/notes
                                  │
                       PATCH /api/billing/notes/[id]
                                  │
                      lib/services/notes-service.ts
                     ┌─────────────┼─────────────┬──────────────┐
              InvoiceNote      Invoice       Transaction/      Auth Clerk
              (persistencia)  (factura      JournalEntry      (POST/PATCH)
                              original + CAI) (asiento AJUSTE)
```

## 3. Archivos Implementados (detalle)

- `lib/services/notes-service.ts` — interfaces `NoteType` (CREDIT|DEBIT), `NoteStatus` (PENDING|APPLIED|CANCELLED), `NoteRecord`, `NoteWithInvoice`; funciones `resolveTenantId`, `nextNoteNumber`, `listNotes`, `getNote`, `createNote`, `postNoteJournal`, `updateNoteStatus`.
- `app/api/billing/notes/route.ts` — `GET` resuelve tenant desde header `x-tenant-id` o query `tenantId` (sin auth) y filtra por `type`/`status`/`from`/`to`; `POST` exige `auth()` de Clerk y crea la nota.
- `app/api/billing/notes/[id]/route.ts` — `GET` una nota por id+tenant; `PATCH` actualiza estado (Aplicar → setea `appliedDate`). **Next 16**: `params` es `Promise<{id}>` → `await context.params`.
- `components/billing/NoteForm.tsx` — selector de factura original (carga facturas CUSTOMER), fecha, monto, motivo (obligatorio), contra-cuenta del asiento (crédito `1103` / efectivo `1101`), vista previa Subtotal/ISV(15%)/Total. Valida monto > 0 y que el débito no exceda el total de la factura.
- `components/billing/NotePreview.tsx` — documento fiscal: nombre/RTN/dirección del emisor, número NC-/ND-, fecha, estado, cliente, RTN, factura original, **CAI de la factura original**, motivo, monto a restituir/cobrar y leyenda SAR-HN. Impresión con `window.print()` sobre ventana nueva.
- `app/billing/notes/page.tsx` — KPIs (Total Notas, Créditos, Débitos, Efecto Neto ISV = débitos − créditos), búsqueda por motivo, filtros de tipo y estado, tabla con acciones Ver / Aplicar / Anular.

## 4. API REST

### `GET /api/billing/notes?tenantId=<id>&type=<CREDIT|DEBIT>&status=<PENDING|APPLIED|CANCELLED>&from=<date>&to=<date>`

**Respuesta `200 OK`:**
```json
{
  "tenantId": "1",
  "notes": [
    {
      "id": "…",
      "tenantId": "1",
      "originalInvoiceId": "…",
      "noteType": "CREDIT",
      "noteNumber": "NC-00000001",
      "reason": "Devolución de mercancía",
      "amount": 115.00,
      "status": "PENDING",
      "appliedDate": "2026-09-16",
      "createdAt": "…",
      "createdBy": "…",
      "invoice": { "invoiceNumber": "…", "customerName": "…", "customerRTN": "…", "total": 1150.00, "cai": "…" }
    }
  ]
}
```

### `POST /api/billing/notes` (requiere auth Clerk)

**Body:** `{ noteType, date, originalInvoiceId?, invoiceNumber?, customerName?, reason, amount, paymentMethod? }`

**Respuesta `201`:** `{ success: true, note: {…} }` — errores: `400` motivo/monto, `401` sin sesión, `500` interno.

### `GET /api/billing/notes/[id]?tenantId=<id>`

- `200` con `{ note }`; `404` si no existe para el tenant.

### `PATCH /api/billing/notes/[id]?tenantId=<id>` (requiere auth Clerk)

- **Body:** `{ "status": "APPLIED" | "CANCELLED" }`
- `200` con `{ success: true, note }`; `400` estado inválido; `401` sin sesión.

## 5. Esquema de Datos (`InvoiceNote`)

Tabla creada en `scripts/migrations/005_invoice_tables_consolidated.sql` (idempotente):

| Columna | Tipo | Notas |
|---|---|---|
| `id` | TEXT PK | `gen_random_uuid()::TEXT` |
| `tenantId` | TEXT NOT NULL FK `Tenant` | ON DELETE CASCADE |
| `originalInvoiceId` | TEXT FK `Invoice` | NULLABLE, ON DELETE SET NULL |
| `noteType` | VARCHAR(20) | CHECK `('CREDIT','DEBIT')` |
| `noteNumber` | VARCHAR(50) NOT NULL | NC-XXXXXXXX / ND-XXXXXXXX |
| `reason` | TEXT NOT NULL | Motivo del ajuste |
| `amount` | DECIMAL(15,2) NOT NULL | Lempiras (total con ISV incluido) |
| `status` | VARCHAR(20) NOT NULL DEFAULT `'PENDING'` | CHECK `('PENDING','APPLIED','CANCELLED')` |
| `appliedDate` | DATE | Fecha de aplicación |
| `createdAt` | TIMESTAMPTZ DEFAULT now() | — |
| `createdBy` | TEXT FK `User` | Emisor |

Índices: `idx_invoice_note_tenant` (tenantId), `idx_invoice_note_original` (originalInvoiceId). **RLS habilitado** con políticas por tenant (view/insert/update/delete). No existe modelo Prisma para la tabla (acceso vía cliente Supabase).

## 6. Contabilidad (asiento AJUSTE)

`postNoteJournal` genera el asiento **después** de crear la nota (best-effort, no bloquea la emisión):

- `voucherType = "AJUSTE"`, moneda `HNL`, fecha = `appliedDate`, descripción `Nota de Crédito NC-… - Factura …`.
- ISV 15% **incluido**: `subTotal = amount / 1.15`, `impuesto = amount - subTotal` (redondeo a centavos).
- Cuentas fijas por código: **4101** Ingresos, **2105** ISV por pagar, contra-cuenta **1101** Caja (efectivo) o **1103** Clientes (crédito).

| Tipo | Débitos | Créditos |
|---|---|---|
| **Nota de Crédito** | +sub (4101), +tax (2105) | −total (contra 1101/1103) |
| **Nota de Débito** | +total (contra 1101/1103) | −sub (4101), −tax (2105) |

El asiento es **balanceado** (suma de movimientos = 0) y se envía por HTTP a `POST /api/accounting/transactions` con header `x-tenant-id`. Si falla, el error se registra en consola y la nota queda igualmente emitida.

## 7. UI (`/billing/notes`)

- KPIs: **Total Notas**, **Créditos** (activas), **Débitos** (activas), **Efecto Neto ISV** (débitos − créditos).
- Filtros: por motivo (búsqueda), por tipo (CREDIT/DEBIT) y por estado (PENDING/APPLIED/CANCELLED).
- Acciones por fila: **Ver** (documento fiscal con impresión), **Aplicar** (PENDING → APPLIED), **Anular** (→ CANCELLED, con confirmación; permanente).
- Creación vía `CreditNoteForm` / `DebitNoteForm` con vista previa de desglose ISV 15%.

## 8. Fiscales (cumplimiento SAR-HN)

- Las notas **no consumen CAI propio**; referencian el **CAI de la factura original**.
- Numeración interna **NC-**/**ND-** independiente por tenant (secuencial por tipo).
- El documento fiscal impreso incluye la leyenda: *"Nota de crédito/débito sin CAI propio, referencia CAI de la factura original según normativa SAR-HN"*, original para el cliente y copia para el obligado tributario emisor.

## 9. Verificación (16 Sept 2026)

- `pnpm build` → **EXIT=0**.
- Rutas compiladas: `ƒ /api/billing/notes`, `ƒ /api/billing/notes/[id]`, `○ /billing/notes`.
- Prueba de capa de datos contra Supabase real: `InvoiceNote` **INSERT 201**, **SELECT 200**, **DELETE 204**; `Invoice` **SELECT 200**.

## 10. Limitaciones y Pendientes

- **Impresión**: se usa `window.print()` (sin generación de PDF server-side profesional).
- **Anulación**: es permanente y no genera contra-asiento automático (no revierte el AJUSTE inicial).
- **Series NC/ND**: no se validan contra rangos CAI (dependen del CAI de la factura original).
- **Asiento best-effort**: si falla `/api/accounting/transactions` la nota se emite igual y el asiento queda fuera (requiere reproceso manual).
- **Factura original**: si no existe en `Invoice`, el vínculo se omite (nota independiente).
- **Sin emisión/sincronización a plataforma SAR** (proceso manual/futuro).
- La página requiere empresa seleccionada (`useTenant`); el `GET` público es de solo lectura.

## 11. Archivos Relacionados

- `lib/contexts/TenantContext.tsx` — empresa activa (id de tenant usado en queries y bodys).
- `app/api/admin/billing/invoices/route.ts` — fuente de facturas CUSTOMER para el selector del formulario.
- `app/billing/page.tsx` — botón de acceso al submódulo.
- `scripts/migrations/005_invoice_tables_consolidated.sql` — DDL de `InvoiceNote` (también `Invoice`, `InvoiceItem`, `InvoicePayment`).
- Contra-flujo fiscal: `docs/DIAT_REPORT.md` (declaración informativa mensual).