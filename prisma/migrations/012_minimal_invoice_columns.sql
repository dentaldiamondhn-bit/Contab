-- ============================================================================
-- MINIMAL MIGRATION: Solo agrega columnas esenciales (sin updates complejos)
-- Date: 2026-05-02
-- Ejecutar esto si la migración 011 falla
-- ============================================================================

BEGIN;

-- ============================================================================
-- COLUMNAS ESENCIALES PARA INVOICE
-- ============================================================================

DO $$
BEGIN
    -- invoiceType (si no existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'invoiceType'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "invoiceType" VARCHAR(20) DEFAULT 'CUSTOMER';
    END IF;

    -- customerEmail (si no existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'customerEmail'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "customerEmail" VARCHAR(255);
    END IF;

    -- dueDate (si no existe - detectar y crear con tipo apropiado)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'dueDate'
    ) THEN
        -- Crear como VARCHAR para evitar conflictos de tipo
        ALTER TABLE "Invoice" ADD COLUMN "dueDate" VARCHAR(50);
    END IF;

    -- issuerPhone (si no existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'issuerPhone'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "issuerPhone" VARCHAR(50);
    END IF;

    -- issuerEmail (si no existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'issuerEmail'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "issuerEmail" VARCHAR(255);
    END IF;

    -- tax (si no existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'tax'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "tax" FLOAT DEFAULT 0;
    END IF;

    -- invoiceImageUrl (si no existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'invoiceImageUrl'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "invoiceImageUrl" VARCHAR(500);
    END IF;
END $$;

-- ============================================================================
-- COLUMNAS ESENCIALES PARA INVOICEITEM
-- ============================================================================

DO $$
BEGIN
    -- description (si no existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'InvoiceItem' AND column_name = 'description'
    ) THEN
        ALTER TABLE "InvoiceItem" ADD COLUMN "description" TEXT;
    END IF;

    -- taxRate (si no existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'InvoiceItem' AND column_name = 'taxRate'
    ) THEN
        ALTER TABLE "InvoiceItem" ADD COLUMN "taxRate" FLOAT DEFAULT 15;
    END IF;

    -- taxAmount (si no existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'InvoiceItem' AND column_name = 'taxAmount'
    ) THEN
        ALTER TABLE "InvoiceItem" ADD COLUMN "taxAmount" FLOAT DEFAULT 0;
    END IF;

    -- total (si no existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'InvoiceItem' AND column_name = 'total'
    ) THEN
        ALTER TABLE "InvoiceItem" ADD COLUMN "total" FLOAT DEFAULT 0;
    END IF;
END $$;

-- ============================================================================
-- ÍNDICES BÁSICOS
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

COMMIT;

-- ============================================================================
-- ACTUALIZACIONES DE DATOS SIMPLES (post-commit)
-- ============================================================================

-- Actualizar tax desde totalTax si existe
UPDATE "Invoice" SET "tax" = "totalTax" 
WHERE ("tax" IS NULL OR "tax" = 0) AND "totalTax" IS NOT NULL AND "totalTax" > 0;

-- Establecer tipo de factura por defecto
UPDATE "Invoice" SET "invoiceType" = 'CUSTOMER' WHERE "invoiceType" IS NULL;

-- Calcular totales en InvoiceItem
UPDATE "InvoiceItem" SET "total" = COALESCE("subtotal", 0) + COALESCE("taxAmount", 0)
WHERE ("total" IS NULL OR "total" = 0);
