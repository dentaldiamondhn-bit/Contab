-- Migración 012: Añadir company_id a tablas multi-tenant para soporte multi-empresa por tenant
-- Contexto: Un tenant puede tener varias empresas (companies). Cada empresa debe tener sus datos aislados
-- (facturas, transacciones, asientos, cuentas, etc.) mediante company_id.
-- Ejecutar en Supabase SQL Editor.

-- ========================================
-- 1. TABLA "Invoice" (facturas emitidas/recibidas)
-- ========================================
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_invoice_company ON "Invoice"(company_id);

-- Backfill: asignar company_id existente según tenant (si solo 1 empresa por tenant)
UPDATE "Invoice" i
SET company_id = c.id
FROM companies c
WHERE i."tenantId" = c.tenant_id
  AND i.company_id IS NULL;

-- ========================================
-- 2. TABLA "Transaction" (transacciones contables)
-- ========================================
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_transaction_company ON "Transaction"(company_id);

UPDATE "Transaction" t
SET company_id = c.id
FROM companies c
WHERE t.tenantid = c.tenant_id
  AND t.company_id IS NULL;

-- ========================================
-- 3. TABLA "JournalEntry" (asientos contables)
-- ========================================
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_journalentry_company ON "JournalEntry"(company_id);

UPDATE "JournalEntry" j
SET company_id = c.id
FROM companies c
WHERE j."tenantId" = c.tenant_id
  AND j.company_id IS NULL;

-- ========================================
-- 4. TABLA "Account" (plan de cuentas)
-- ========================================
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_account_company ON "Account"(company_id);

UPDATE "Account" a
SET company_id = c.id
FROM companies c
WHERE a."tenantId" = c.tenant_id
  AND a.company_id IS NULL;

-- ========================================
-- 5. TABLA "InvoiceItem" (ítems de factura) - hereda de Invoice, pero por integridad
-- ========================================
ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_invoiceitem_company ON "InvoiceItem"(company_id);

WITH company_mapping AS (
  SELECT ii.id, c.id as company_id
  FROM "InvoiceItem" ii
  JOIN "Invoice" i ON ii."invoiceId" = i.id
  JOIN companies c ON i."tenantId" = c.tenant_id
  WHERE ii.company_id IS NULL
)
UPDATE "InvoiceItem"
SET company_id = company_mapping.company_id
FROM company_mapping
WHERE "InvoiceItem".id = company_mapping.id;

-- ========================================
-- 6. TABLA "InvoicePayment" (pagos de factura)
-- ========================================
ALTER TABLE "InvoicePayment" ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_invoicepayment_company ON "InvoicePayment"(company_id);

WITH company_mapping AS (
  SELECT ip.id, c.id as company_id
  FROM "InvoicePayment" ip
  JOIN "Invoice" i ON ip."invoiceId" = i.id
  JOIN companies c ON i."tenantId" = c.tenant_id
  WHERE ip.company_id IS NULL
)
UPDATE "InvoicePayment"
SET company_id = company_mapping.company_id
FROM company_mapping
WHERE "InvoicePayment".id = company_mapping.id;

-- ========================================
-- 7. TABLA "InvoiceNote" (notas crédito/débito)
-- ========================================
ALTER TABLE "InvoiceNote" ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_invoicenote_company ON "InvoiceNote"(company_id);

WITH company_mapping AS (
  SELECT ip.id, c.id as company_id
  FROM "InvoiceNote" ip
  JOIN "Invoice" i ON ip."originalInvoiceId" = i.id
  JOIN companies c ON i."tenantId" = c.tenant_id
  WHERE ip.company_id IS NULL
)
UPDATE "InvoiceNote"
SET company_id = company_mapping.company_id
FROM company_mapping
WHERE "InvoiceNote".id = company_mapping.id;

-- ========================================
-- 8. TABLA "User" (usuarios del tenant) - opcional, para filtrar usuarios por empresa
-- ========================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_user_company ON "User"(company_id);

UPDATE "User" u
SET company_id = c.id
FROM companies c
WHERE u.tenantid = c.tenant_id
  AND u.company_id IS NULL;

-- ========================================
-- 9. TABLA "BankAccount" (cuentas bancarias)
-- ========================================
ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_bankaccount_company ON "BankAccount"(company_id);

UPDATE "BankAccount" ba
SET company_id = c.id
FROM companies c
WHERE ba.tenantid = c.tenant_id
  AND ba.company_id IS NULL;

-- ========================================
-- 10. TABLA "Product" (productos/inventario)
-- ========================================
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_product_company ON "Product"(company_id);

UPDATE "Product" p
SET company_id = c.id
FROM companies c
WHERE p.tenant_id = c.tenant_id
  AND p.company_id IS NULL;

-- ========================================
-- 11. TABLA "SalesConfig" (configuración de ventas por empresa)
-- ========================================
ALTER TABLE "SalesConfig" ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_salesconfig_company ON "SalesConfig"(company_id);

UPDATE "SalesConfig" sc
SET company_id = c.id
FROM companies c
WHERE sc.tenant_id = c.tenant_id
  AND sc.company_id IS NULL;

-- ========================================
-- VERIFICACIÓN
-- ========================================
-- Comprobar que todas las tablas tienen company_id y datos
SELECT 
  'Invoice' as tabla, count(*) as total, count(company_id) as con_company_id FROM "Invoice"
UNION ALL SELECT 'Transaction', count(*), count(company_id) FROM "Transaction"
UNION ALL SELECT 'JournalEntry', count(*), count(company_id) FROM "JournalEntry"
UNION ALL SELECT 'Account', count(*), count(company_id) FROM "Account"
UNION ALL SELECT 'InvoiceItem', count(*), count(company_id) FROM "InvoiceItem"
UNION ALL SELECT 'InvoicePayment', count(*), count(company_id) FROM "InvoicePayment"
UNION ALL SELECT 'InvoiceNote', count(*), count(company_id) FROM "InvoiceNote"
UNION ALL SELECT 'Product', count(*), count(company_id) FROM "Product"
UNION ALL SELECT 'User', count(*), count(company_id) FROM "User"
UNION ALL SELECT 'BankAccount', count(*), count(company_id) FROM "BankAccount"
UNION ALL SELECT 'SalesConfig', count(*), count(company_id) FROM "SalesConfig"
ORDER BY tabla;