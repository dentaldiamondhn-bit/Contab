-- ============================================================================
-- MIGRACIÓN PARA SUPABASE - Ejecutar en SQL Editor
-- Copiar todo y pegar en: https://app.supabase.com/project/kudsqsbxbmviesiaesct/sql-editor
-- ============================================================================

-- ============================================================================
-- 1. COLUMNAS ESENCIALES PARA INVOICE
-- ============================================================================

-- invoiceType
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'invoiceType'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "invoiceType" VARCHAR(20) DEFAULT 'CUSTOMER';
    END IF;
END $$;

-- customerEmail
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'customerEmail'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "customerEmail" VARCHAR(255);
    END IF;
END $$;

-- dueDate
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'dueDate'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "dueDate" VARCHAR(50);
    END IF;
END $$;

-- issuerPhone
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'issuerPhone'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "issuerPhone" VARCHAR(50);
    END IF;
END $$;

-- issuerEmail
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'issuerEmail'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "issuerEmail" VARCHAR(255);
    END IF;
END $$;

-- tax
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'tax'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "tax" FLOAT DEFAULT 0;
    END IF;
END $$;

-- invoiceImageUrl
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'invoiceImageUrl'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "invoiceImageUrl" VARCHAR(500);
    END IF;
END $$;

-- ============================================================================
-- 2. COLUMNAS ESENCIALES PARA INVOICEITEM
-- ============================================================================

-- description
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'InvoiceItem' AND column_name = 'description'
    ) THEN
        ALTER TABLE "InvoiceItem" ADD COLUMN "description" TEXT;
    END IF;
END $$;

-- taxRate
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'InvoiceItem' AND column_name = 'taxRate'
    ) THEN
        ALTER TABLE "InvoiceItem" ADD COLUMN "taxRate" FLOAT DEFAULT 15;
    END IF;
END $$;

-- taxAmount
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'InvoiceItem' AND column_name = 'taxAmount'
    ) THEN
        ALTER TABLE "InvoiceItem" ADD COLUMN "taxAmount" FLOAT DEFAULT 0;
    END IF;
END $$;

-- total
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'InvoiceItem' AND column_name = 'total'
    ) THEN
        ALTER TABLE "InvoiceItem" ADD COLUMN "total" FLOAT DEFAULT 0;
    END IF;
END $$;

-- ============================================================================
-- 3. ÍNDICES
-- ============================================================================

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "idx_invoice_invoiceType" ON "Invoice"("invoiceType");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "idx_invoice_dueDate" ON "Invoice"("dueDate");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 4. ACTUALIZAR DATOS EXISTENTES
-- ============================================================================

-- Actualizar tax desde totalTax
UPDATE "Invoice" SET "tax" = "totalTax" 
WHERE ("tax" IS NULL OR "tax" = 0) AND "totalTax" IS NOT NULL;

-- Establecer tipo de factura por defecto
UPDATE "Invoice" SET "invoiceType" = 'CUSTOMER' WHERE "invoiceType" IS NULL;

-- Calcular totales en InvoiceItem (usando totalamount)
UPDATE "InvoiceItem" SET "total" = COALESCE("totalamount", 0) + COALESCE("taxAmount", 0)
WHERE ("total" IS NULL OR "total" = 0);

-- ============================================================================
-- 5. VERIFICACIÓN (descomentar para verificar)
-- ============================================================================

-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'Invoice' 
-- ORDER BY ordinal_position;
