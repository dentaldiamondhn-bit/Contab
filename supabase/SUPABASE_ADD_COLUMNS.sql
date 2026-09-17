-- EJECUTAR EN SUPABASE SQL EDITOR - Query 2: Agregar columnas faltantes
-- Si la columna ya existe, simplemente ignorará el error

-- Columnas para Invoice
ALTER TABLE "Invoice" 
ADD COLUMN IF NOT EXISTS "invoiceType" VARCHAR(20) DEFAULT 'CUSTOMER',
ADD COLUMN IF NOT EXISTS "customerEmail" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "dueDate" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "issuerPhone" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "issuerEmail" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "tax" FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS "invoiceImageUrl" VARCHAR(500);

-- Columnas para InvoiceItem
ALTER TABLE "InvoiceItem" 
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "taxRate" FLOAT DEFAULT 15,
ADD COLUMN IF NOT EXISTS "taxAmount" FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS "total" FLOAT DEFAULT 0;

-- Índices
CREATE INDEX IF NOT EXISTS "idx_invoice_invoiceType" ON "Invoice"("invoiceType");
CREATE INDEX IF NOT EXISTS "idx_invoice_dueDate" ON "Invoice"("dueDate");

-- Actualizar datos existentes
UPDATE "Invoice" SET "tax" = "totalTax" WHERE "tax" = 0 AND "totalTax" IS NOT NULL;
UPDATE "Invoice" SET "invoiceType" = 'CUSTOMER' WHERE "invoiceType" IS NULL;
UPDATE "InvoiceItem" SET "total" = COALESCE("totalamount", 0) + COALESCE("taxAmount", 0) WHERE "total" = 0;

-- Verificar resultado
SELECT 'Columnas agregadas correctamente' as status;
