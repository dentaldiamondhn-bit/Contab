-- ============================================================================
-- SAFE MIGRATION: Add invoice system columns with existence checks
-- Date: 2026-05-02
-- This script safely adds columns even if they already exist
-- ============================================================================

-- Wrap everything in a transaction
BEGIN;

-- ============================================================================
-- ADD COLUMNS TO INVOICE TABLE (Only if they don't exist)
-- ============================================================================

DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- invoice_type
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'invoice_type'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "invoice_type" VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER';
        RAISE NOTICE 'Added: invoice_type';
    END IF;

    -- customer_email
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'customer_email'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "customer_email" VARCHAR(255);
        RAISE NOTICE 'Added: customer_email';
    END IF;

    -- due_date
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'due_date'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "due_date" TIMESTAMP;
        RAISE NOTICE 'Added: due_date';
    END IF;

    -- issuer_phone
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'issuer_phone'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "issuer_phone" VARCHAR(50);
        RAISE NOTICE 'Added: issuer_phone';
    END IF;

    -- issuer_email
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'issuer_email'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "issuer_email" VARCHAR(255);
        RAISE NOTICE 'Added: issuer_email';
    END IF;

    -- establishment_code
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'establishment_code'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "establishment_code" VARCHAR(10) DEFAULT '0001';
        RAISE NOTICE 'Added: establishment_code';
    END IF;

    -- point_of_sale_code
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'point_of_sale_code'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "point_of_sale_code" VARCHAR(10) DEFAULT '0001';
        RAISE NOTICE 'Added: point_of_sale_code';
    END IF;

    -- tax
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'tax'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "tax" FLOAT DEFAULT 0;
        RAISE NOTICE 'Added: tax';
    END IF;

    -- invoice_image_url
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'invoice_image_url'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "invoice_image_url" VARCHAR(500);
        RAISE NOTICE 'Added: invoice_image_url';
    END IF;
END $$;

-- ============================================================================
-- ADD COLUMNS TO INVOICEITEM TABLE (Only if they don't exist)
-- ============================================================================

DO $$
DECLARE
    col_exists BOOLEAN;
    table_exists BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'InvoiceItem'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- description
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'InvoiceItem' AND column_name = 'description'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            ALTER TABLE "InvoiceItem" ADD COLUMN "description" TEXT;
            RAISE NOTICE 'Added: InvoiceItem.description';
        END IF;

        -- tax_rate
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'InvoiceItem' AND column_name = 'tax_rate'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            ALTER TABLE "InvoiceItem" ADD COLUMN "tax_rate" FLOAT DEFAULT 15;
            RAISE NOTICE 'Added: InvoiceItem.tax_rate';
        END IF;

        -- tax_amount
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'InvoiceItem' AND column_name = 'tax_amount'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            ALTER TABLE "InvoiceItem" ADD COLUMN "tax_amount" FLOAT DEFAULT 0;
            RAISE NOTICE 'Added: InvoiceItem.tax_amount';
        END IF;

        -- total
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'InvoiceItem' AND column_name = 'total'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            ALTER TABLE "InvoiceItem" ADD COLUMN "total" FLOAT DEFAULT 0;
            RAISE NOTICE 'Added: InvoiceItem.total';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- CREATE INDEXES (Only if they don't exist)
-- ============================================================================

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "idx_invoice_type" ON "Invoice"("invoice_type");
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Index idx_invoice_type already exists';
END $$;

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "idx_invoice_due_date" ON "Invoice"("due_date");
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Index idx_invoice_due_date already exists';
END $$;

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "idx_invoice_image_url" ON "Invoice"("invoice_image_url");
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Index idx_invoice_image_url already exists';
END $$;

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "idx_invoice_item_invoice_id" ON "InvoiceItem"("invoice_id");
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Index idx_invoice_item_invoice_id already exists';
END $$;

COMMIT;

-- ============================================================================
-- DATA MIGRATION (Run after transaction commits)
-- ============================================================================

-- Update due dates
UPDATE "Invoice" 
SET "due_date" = "invoice_date" + INTERVAL '30 days' 
WHERE "due_date" IS NULL AND "invoice_date" IS NOT NULL;

-- Update tax from total_tax
UPDATE "Invoice" 
SET "tax" = "total_tax" 
WHERE ("tax" IS NULL OR "tax" = 0) AND "total_tax" IS NOT NULL;

-- Update InvoiceItem totals
UPDATE "InvoiceItem" 
SET "total" = COALESCE("subtotal", 0) + COALESCE("tax_amount", 0)
WHERE ("total" IS NULL OR "total" = 0);

-- Update InvoiceItem tax_amount
UPDATE "InvoiceItem" 
SET "tax_amount" = COALESCE("subtotal", 0) * 0.15
WHERE ("tax_amount" IS NULL OR "tax_amount" = 0) AND COALESCE("tax_rate", 15) = 15;
