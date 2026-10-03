-- 021_invoiceitem_product_id.sql
-- Vincula cada linea de factura con el producto del inventario del que salio.
-- Antes el vinculo era solo `productCode` (texto libre), que se repite entre
-- empresas: la factura 001-01-01-00000008 de ANGELOH7 referenciaba PRD-001, que
-- es de "Empresa 1".
-- Idempotente: seguro de re-ejecutar en el SQL Editor de Supabase.

ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS product_id TEXT;

-- Indice parcial para no penalizar las lineas escritas a mano (sin producto).
CREATE INDEX IF NOT EXISTS "InvoiceItem_product_id_idx"
  ON "InvoiceItem" (product_id)
  WHERE product_id IS NOT NULL;
