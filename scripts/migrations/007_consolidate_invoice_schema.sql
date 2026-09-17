-- ============================================================================
-- MIGRACIÓN 007: CONSOLIDACIÓN DEL ESQUEMA DE FACTURAS
-- ============================================================================
-- Objetivo: dejar una ÚNICA tabla de facturas ("Invoice" / "InvoiceItem")
-- con una ÚNICA convención de columnas (camelCase) y eliminar:
--   * columnas duplicadas en minúsculas dentro de "Invoice"/"InvoiceItem"
--   * tablas legacy:  invoice, invoiceitem, invoices, invoice_items
--
-- Contexto:
--   * La tabla "Invoice" acumuló 57 columnas por parches (migraciones 007-012
--     agregaron snake_case y camelCase). Sólo las camelCase son usadas por la
--     app (admin, notas, sales, POS tras esta consolidación).
--   * El POS escribía en la tabla legacy `invoice` (montos en CENTAVOS);
--     se migran esas filas a "Invoice" en LEMPIRAS.
--   * Las vistas fiscales (libro_ventas, libro_compras, resumen_isv,
--     declaracion_mensual, top_clientes, cuentas_por_cobrar/pagar) leían
--     las columnas en minúsculas; se recrean con camelCase.
--
-- IMPORTANTE:
--   * Ejecutar en el SQL Editor de Supabase (rol postgres).
--   * Datos actuales: "Invoice"=0 filas, "InvoiceItem"=0 filas.
--   * POS: `invoice`=8 filas / `invoiceitem`=7 filas.
--   * Tenant "1" NO existe en "Tenant"; las filas del POS con tenant_id='1'
--     se OMITEN (huérfanas de prueba). Sólo se migran tenants válidos.
--     Si se desea reasignarlas, ver el bloque comentado al final de la sección 4.
--   * Todo está dentro de una transacción: si algo falla, no se aplica nada.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Eliminar vistas dependientes de "Invoice" (se recrean en la sección 5)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS libro_ventas CASCADE;
DROP VIEW IF EXISTS libro_compras CASCADE;
DROP VIEW IF EXISTS resumen_isv CASCADE;
DROP VIEW IF EXISTS declaracion_mensual CASCADE;
DROP VIEW IF EXISTS top_clientes CASCADE;
DROP VIEW IF EXISTS cuentas_por_cobrar CASCADE;
DROP VIEW IF EXISTS cuentas_por_pagar CASCADE;
DROP VIEW IF EXISTS "InvoiceSummary" CASCADE;

-- ----------------------------------------------------------------------------
-- 2. Eliminar columnas duplicadas (minúsculas) en "Invoice" / "InvoiceItem"
--    Son todas columnas vacías/con default, creadas por MASTER_SETUP.sql y
--    migraciones 007-012. Se conserva la versión camelCase.
-- ----------------------------------------------------------------------------
ALTER TABLE "Invoice"
  DROP COLUMN IF EXISTS tenantid CASCADE,
  DROP COLUMN IF EXISTS invoicenumber CASCADE,
  DROP COLUMN IF EXISTS invoicedate CASCADE,
  DROP COLUMN IF EXISTS duedate CASCADE,
  DROP COLUMN IF EXISTS invoicetype CASCADE,
  DROP COLUMN IF EXISTS customerid CASCADE,
  DROP COLUMN IF EXISTS customerrtn CASCADE,
  DROP COLUMN IF EXISTS customername CASCADE,
  DROP COLUMN IF EXISTS customeremail CASCADE,
  DROP COLUMN IF EXISTS customeraddress CASCADE,
  DROP COLUMN IF EXISTS issuerrtn CASCADE,
  DROP COLUMN IF EXISTS issuername CASCADE,
  DROP COLUMN IF EXISTS issueraddress CASCADE,
  DROP COLUMN IF EXISTS issuerphone CASCADE,
  DROP COLUMN IF EXISTS issueremail CASCADE,
  DROP COLUMN IF EXISTS rangestart CASCADE,
  DROP COLUMN IF EXISTS rangeend CASCADE,
  DROP COLUMN IF EXISTS expirydate CASCADE,
  DROP COLUMN IF EXISTS establishmentcode CASCADE,
  DROP COLUMN IF EXISTS pointofsalecode CASCADE,
  DROP COLUMN IF EXISTS items CASCADE,
  DROP COLUMN IF EXISTS totaltax CASCADE,
  DROP COLUMN IF EXISTS taxrate CASCADE,
  DROP COLUMN IF EXISTS invoiceimageurl CASCADE,
  DROP COLUMN IF EXISTS caiid CASCADE,
  DROP COLUMN IF EXISTS createdat CASCADE,
  DROP COLUMN IF EXISTS updatedat CASCADE;

ALTER TABLE "InvoiceItem"
  DROP COLUMN IF EXISTS invoiceid CASCADE,
  DROP COLUMN IF EXISTS planid CASCADE,
  DROP COLUMN IF EXISTS planname CASCADE,
  DROP COLUMN IF EXISTS unitprice CASCADE,
  DROP COLUMN IF EXISTS totalamount CASCADE,
  DROP COLUMN IF EXISTS taxrate CASCADE,
  DROP COLUMN IF EXISTS taxamount CASCADE,
  DROP COLUMN IF EXISTS createdat CASCADE;

-- ----------------------------------------------------------------------------
-- 3. Migrar facturas del POS (legacy `invoice`, centavos) -> "Invoice" (Lempiras)
--    - status: PAGADA/PAID -> PAID
--    - issuer*: datos del Tenant; RTN truncado a 20 (columna VARCHAR(20))
--    - Sólo filas cuyo tenant_id exista en "Tenant"
-- ----------------------------------------------------------------------------
INSERT INTO "Invoice" (
  id,
  "tenantId",
  "invoiceNumber",
  "invoiceType",
  status,
  "customerName",
  "customerRTN",
  "customerEmail",
  "customerAddress",
  "issuerName",
  "issuerRTN",
  "issuerAddress",
  "issueDate",
  "dueDate",
  cai,
  "rangeStart",
  "rangeEnd",
  "expiryDate",
  subtotal,
  tax,
  total,
  currency,
  "taxRate",
  notes,
  "createdAt",
  "updatedAt"
)
SELECT
  i.id::text,
  i.tenant_id,
  i.invoice_number,
  'CUSTOMER',
  CASE
    WHEN UPPER(COALESCE(i.status, '')) IN ('PAGADA', 'PAID') THEN 'PAID'
    WHEN UPPER(COALESCE(i.status, '')) = 'CANCELLED' THEN 'CANCELLED'
    WHEN UPPER(COALESCE(i.status, '')) = 'OVERDUE' THEN 'OVERDUE'
    ELSE 'PENDING'
  END,
  COALESCE(NULLIF(i.customer_name, ''), 'Consumidor Final'),
  LEFT(COALESCE(i.customer_rtn, ''), 20),
  i.customer_email,
  NULL,
  COALESCE(NULLIF(t.businessname, ''), 'Emisor'),
  LEFT(COALESCE(t.businessrtn, ''), 20),
  t.businessaddress,
  i.date::date,
  i.due_date::date,
  i.cai,
  NULL,
  NULL,
  NULL,
  ROUND(i.subtotal / 100.0, 2),
  ROUND((COALESCE(i.tax_15, 0) + COALESCE(i.tax_18, 0)) / 100.0, 2),
  ROUND(i.total / 100.0, 2),
  'HNL',
  15,
  i.notes,
  COALESCE(i.created_at, now()),
  COALESCE(i.updated_at, i.created_at, now())
FROM invoice i
LEFT JOIN "Tenant" t ON t.id = i.tenant_id
WHERE EXISTS (SELECT 1 FROM "Tenant" tt WHERE tt.id = i.tenant_id)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. Migrar items del POS (legacy `invoiceitem`, centavos) -> "InvoiceItem"
-- ----------------------------------------------------------------------------
INSERT INTO "InvoiceItem" (
  id,
  "invoiceId",
  description,
  quantity,
  "unitPrice",
  total,
  "taxRate",
  "taxAmount",
  "isTaxable",
  "productCode",
  "serviceCode",
  "createdAt",
  "updatedAt"
)
SELECT
  ii.id::text,
  ii.invoice_id::text,
  COALESCE(NULLIF(ii.product_name, ''), NULLIF(ii.product_description, ''), 'Item'),
  ii.quantity,
  ROUND(ii.unit_price / 100.0, 2),
  ROUND(ii.total / 100.0, 2),
  ii.tax_rate,
  ROUND(ii.tax_amount / 100.0, 2),
  true,
  ii.product_code,
  NULL,
  COALESCE(ii.created_at, now()),
  COALESCE(ii.created_at, now())
FROM invoiceitem ii
WHERE EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv.id = ii.invoice_id::text)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4b. (OPCIONAL) Reasignar facturas huérfanas (tenant_id='1') a un tenant real.
--     Descomentar y ajustar el tenant destino si se desea conservarlas.
-- ----------------------------------------------------------------------------
-- INSERT INTO "Invoice" (...mismas columnas...)
-- SELECT ... , 'ANGELOH7' AS "tenantId", ...
-- FROM invoice i WHERE NOT EXISTS (SELECT 1 FROM "Tenant" tt WHERE tt.id = i.tenant_id);

-- ----------------------------------------------------------------------------
-- 5. Recrear vistas fiscales usando columnas camelCase
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW libro_ventas AS
SELECT
  i.id,
  i."invoiceNumber" AS invoice_number,
  i."issueDate" AS invoice_date,
  i."customerName" AS customer_name,
  i."customerRTN" AS customer_rtn,
  i.subtotal,
  i.tax AS tax_amount,
  i.total,
  i.status,
  i."tenantId" AS tenant_id,
  i.cai
FROM "Invoice" i
WHERE i."invoiceType" = 'CUSTOMER'
  AND i.status <> 'CANCELLED'
ORDER BY i."issueDate" DESC;

CREATE OR REPLACE VIEW libro_compras AS
SELECT
  i.id,
  i."invoiceNumber" AS invoice_number,
  i."issueDate" AS invoice_date,
  i."customerName" AS supplier_name,
  i."customerRTN" AS supplier_rtn,
  i.subtotal,
  i.tax AS tax_amount,
  i.total,
  i.status,
  i."tenantId" AS tenant_id,
  i.cai
FROM "Invoice" i
WHERE i."invoiceType" = 'EXPENSE'
  AND i.status <> 'CANCELLED'
ORDER BY i."issueDate" DESC;

CREATE OR REPLACE VIEW resumen_isv AS
SELECT
  i."tenantId" AS tenant_id,
  DATE_TRUNC('month', i."issueDate") AS mes,
  SUM(CASE WHEN i."taxRate" = 15 THEN i.subtotal ELSE 0 END) AS base_gravada_15,
  SUM(CASE WHEN i."taxRate" = 15 THEN i.tax ELSE 0 END) AS isv_15,
  SUM(CASE WHEN i."taxRate" = 18 THEN i.subtotal ELSE 0 END) AS base_gravada_18,
  SUM(CASE WHEN i."taxRate" = 18 THEN i.tax ELSE 0 END) AS isv_18,
  SUM(i.subtotal) AS base_total,
  SUM(i.tax) AS isv_total,
  COUNT(*) AS facturas
FROM "Invoice" i
WHERE i.status <> 'CANCELLED'
GROUP BY i."tenantId", DATE_TRUNC('month', i."issueDate")
ORDER BY mes DESC;

CREATE OR REPLACE VIEW declaracion_mensual AS
SELECT
  i."tenantId" AS tenant_id,
  DATE_TRUNC('month', i."issueDate") AS mes,
  SUM(CASE WHEN i."invoiceType" = 'CUSTOMER' THEN i.subtotal ELSE 0 END) AS ventas_base,
  SUM(CASE WHEN i."invoiceType" = 'CUSTOMER' THEN i.tax ELSE 0 END) AS ventas_isv,
  SUM(CASE WHEN i."invoiceType" = 'CUSTOMER' THEN i.total ELSE 0 END) AS ventas_total,
  COUNT(CASE WHEN i."invoiceType" = 'CUSTOMER' THEN 1 END) AS num_ventas,
  SUM(CASE WHEN i."invoiceType" = 'EXPENSE' THEN i.subtotal ELSE 0 END) AS compras_base,
  SUM(CASE WHEN i."invoiceType" = 'EXPENSE' THEN i.tax ELSE 0 END) AS compras_isv,
  SUM(CASE WHEN i."invoiceType" = 'EXPENSE' THEN i.total ELSE 0 END) AS compras_total,
  COUNT(CASE WHEN i."invoiceType" = 'EXPENSE' THEN 1 END) AS num_compras,
  SUM(CASE WHEN i."invoiceType" = 'CUSTOMER' THEN i.tax ELSE 0 END)
    - SUM(CASE WHEN i."invoiceType" = 'EXPENSE' THEN i.tax ELSE 0 END) AS isv_a_pagar
FROM "Invoice" i
WHERE i.status <> 'CANCELLED'
GROUP BY i."tenantId", DATE_TRUNC('month', i."issueDate")
ORDER BY mes DESC;

CREATE OR REPLACE VIEW top_clientes AS
SELECT
  i."tenantId" AS tenant_id,
  i."customerName" AS client_name,
  i."customerRTN" AS client_rtn,
  i."customerEmail" AS client_email,
  COUNT(*) AS num_facturas,
  SUM(i.subtotal) AS total_base,
  SUM(i.tax) AS total_isv,
  SUM(i.total) AS total_ventas,
  MIN(i."issueDate") AS primera_venta,
  MAX(i."issueDate") AS ultima_venta
FROM "Invoice" i
WHERE i."invoiceType" = 'CUSTOMER'
  AND i.status <> 'CANCELLED'
GROUP BY i."tenantId", i."customerName", i."customerRTN", i."customerEmail"
ORDER BY total_ventas DESC;

CREATE OR REPLACE VIEW cuentas_por_cobrar AS
SELECT
  i."tenantId" AS tenant_id,
  i."customerName" AS client_name,
  i."customerRTN" AS client_rtn,
  i."invoiceNumber" AS invoice_number,
  i."issueDate" AS invoice_date,
  i."dueDate" AS due_date,
  i.total,
  i.status,
  CASE
    WHEN i."dueDate" IS NULL THEN 'SIN_FECHA'
    WHEN i."dueDate" >= CURRENT_DATE THEN 'VIGENTE'
    ELSE 'VENCIDA'
  END AS estado_cobro,
  CASE
    WHEN i."dueDate" IS NULL THEN 0
    WHEN i."dueDate" >= CURRENT_DATE THEN 0
    ELSE CURRENT_DATE - i."dueDate"
  END AS dias_vencido
FROM "Invoice" i
WHERE i."invoiceType" = 'CUSTOMER'
  AND i.status IN ('ACTIVE', 'PENDING', 'SENT')
ORDER BY i."issueDate";

CREATE OR REPLACE VIEW cuentas_por_pagar AS
SELECT
  i."tenantId" AS tenant_id,
  i."customerName" AS supplier_name,
  i."customerRTN" AS supplier_rtn,
  i."invoiceNumber" AS invoice_number,
  i."issueDate" AS invoice_date,
  i."dueDate" AS due_date,
  i.total,
  i.status,
  CASE
    WHEN i."dueDate" IS NULL THEN 'SIN_FECHA'
    WHEN i."dueDate" >= CURRENT_DATE THEN 'VIGENTE'
    ELSE 'VENCIDA'
  END AS estado_pago,
  CASE
    WHEN i."dueDate" IS NULL THEN 0
    WHEN i."dueDate" >= CURRENT_DATE THEN 0
    ELSE CURRENT_DATE - i."dueDate"
  END AS dias_vencido
FROM "Invoice" i
WHERE i."invoiceType" = 'EXPENSE'
  AND i.status IN ('ACTIVE', 'PENDING', 'SENT')
ORDER BY i."issueDate";

CREATE OR REPLACE VIEW "InvoiceSummary" AS
SELECT
  i."id",
  i."tenantId",
  i."invoiceNumber",
  i."invoiceType",
  i."status",
  i."customerName",
  i."customerRTN",
  i."issueDate",
  i."dueDate",
  i."total",
  i."currency",
  CASE
    WHEN i."dueDate" < CURRENT_DATE AND i."status" <> 'PAID' THEN 'OVERDUE'
    ELSE i."status"
  END AS "calculatedStatus",
  COALESCE(SUM(ip."amount"), 0) AS "paidAmount",
  i."total" - COALESCE(SUM(ip."amount"), 0) AS "balanceDue",
  i."createdAt",
  i."updatedAt"
FROM "Invoice" i
LEFT JOIN "InvoicePayment" ip ON i."id" = ip."invoiceId"
GROUP BY i."id", i."tenantId", i."invoiceNumber", i."invoiceType", i."status",
         i."customerName", i."customerRTN", i."issueDate", i."dueDate",
         i."total", i."currency", i."createdAt", i."updatedAt";

-- ----------------------------------------------------------------------------
-- 6. Eliminar tablas legacy
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoiceitem CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS invoice CASCADE;

COMMIT;

-- ============================================================================
-- 7. VERIFICACIÓN (ejecutar por separado)
-- ============================================================================
-- SELECT COUNT(*) AS facturas_migradas FROM "Invoice";
-- SELECT COUNT(*) AS items_migrados FROM "InvoiceItem";
-- SELECT "tenantId", status, subtotal, tax, total FROM "Invoice" ORDER BY "issueDate";
-- SELECT * FROM libro_ventas;
-- SELECT * FROM resumen_isv;
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'Invoice' ORDER BY ordinal_position;
-- SELECT to_regclass('public.invoice') AS legacy_invoice,
--        to_regclass('public.invoiceitem') AS legacy_invoiceitem,
--        to_regclass('public.invoices') AS legacy_invoices,
--        to_regclass('public.invoice_items') AS legacy_invoice_items;
-- ============================================================================
