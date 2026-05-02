-- ============================================================================
-- FIX: Add missing columns with correct PostgreSQL naming
-- Date: 2026-05-02
-- ============================================================================

-- Start transaction
BEGIN;

-- First, let's check what columns actually exist
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Check and add invoice_type to Invoice
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'invoice_type'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "invoice_type" VARCHAR(20) DEFAULT 'CUSTOMER';
        RAISE NOTICE 'Added invoice_type column';
    ELSE
        RAISE NOTICE 'invoice_type column already exists';
    END IF;

    -- Check and add invoice_number if missing
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'invoice_number'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        -- Check for alternative column names
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Invoice' AND column_name = 'invoiceNumber'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            RAISE NOTICE 'invoice_number column does not exist - may need manual check';
        END IF;
    END IF;
END $$;

-- Add customer_email if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'customer_email'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "customer_email" VARCHAR(255);
    END IF;
END $$;

-- Add due_date if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'due_date'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "due_date" TIMESTAMP;
        
        -- Set default due dates
        UPDATE "Invoice" SET "due_date" = "invoice_date" + INTERVAL '30 days' 
        WHERE "due_date" IS NULL;
    END IF;
END $$;

-- Add issuer contact info
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'issuer_phone'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "issuer_phone" VARCHAR(50);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'issuer_email'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "issuer_email" VARCHAR(255);
    END IF;
END $$;

-- Add legal format codes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'establishment_code'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "establishment_code" VARCHAR(10) DEFAULT '0001';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'point_of_sale_code'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "point_of_sale_code" VARCHAR(10) DEFAULT '0001';
    END IF;
END $$;

-- Add tax field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'tax'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "tax" FLOAT DEFAULT 0;
        
        -- Copy from total_tax if exists
        UPDATE "Invoice" SET "tax" = "total_tax" WHERE "tax" = 0;
    END IF;
END $$;

-- Add image URL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'invoice_image_url'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "invoice_image_url" VARCHAR(500);
    END IF;
END $$;

-- ============================================================================
-- FIX INVOICEITEM TABLE
-- ============================================================================

-- Check if InvoiceItem table exists and has correct columns
DO $$
DECLARE
    table_exists BOOLEAN;
    col_exists BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'InvoiceItem'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Check invoice_id column
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'InvoiceItem' AND column_name = 'invoice_id'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            RAISE NOTICE 'invoice_id column missing in InvoiceItem - checking alternatives';
            
            -- Check for invoiceId (camelCase)
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'InvoiceItem' AND column_name = 'invoiceId'
            ) INTO col_exists;
            
            IF col_exists THEN
                RAISE NOTICE 'Found invoiceId column - database uses camelCase';
            END IF;
        END IF;
        
        -- Add description if missing
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'InvoiceItem' AND column_name = 'description'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            ALTER TABLE "InvoiceItem" ADD COLUMN "description" TEXT;
        END IF;
        
        -- Add tax fields if missing
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'InvoiceItem' AND column_name = 'tax_rate'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            ALTER TABLE "InvoiceItem" ADD COLUMN "tax_rate" FLOAT DEFAULT 15;
        END IF;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'InvoiceItem' AND column_name = 'tax_amount'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            ALTER TABLE "InvoiceItem" ADD COLUMN "tax_amount" FLOAT DEFAULT 0;
        END IF;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'InvoiceItem' AND column_name = 'total'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            ALTER TABLE "InvoiceItem" ADD COLUMN "total" FLOAT DEFAULT 0;
        END IF;
    ELSE
        RAISE NOTICE 'InvoiceItem table does not exist';
    END IF;
END $$;

-- ============================================================================
-- CREATE INDEXES (safely)
-- ============================================================================

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "idx_invoice_type" ON "Invoice"("invoice_type");
EXCEPTION WHEN duplicate_table THEN
    RAISE NOTICE 'Index idx_invoice_type already exists';
END $$;

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "idx_invoice_due_date" ON "Invoice"("due_date");
EXCEPTION WHEN duplicate_table THEN
    RAISE NOTICE 'Index idx_invoice_due_date already exists';
END $$;

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;

-- ============================================================================
-- POST-MIGRATION DATA FIXES
-- ============================================================================

-- Ensure all invoices have a due date
UPDATE "Invoice" SET "due_date" = "invoice_date" + INTERVAL '30 days' 
WHERE "due_date" IS NULL AND "invoice_date" IS NOT NULL;

-- Ensure tax is set from total_tax
UPDATE "Invoice" SET "tax" = "total_tax" 
WHERE ("tax" IS NULL OR "tax" = 0) AND "total_tax" > 0;

-- Calculate totals for invoice items
UPDATE "InvoiceItem" 
SET "total" = COALESCE("subtotal", 0) + COALESCE("tax_amount", 0)
WHERE ("total" IS NULL OR "total" = 0);

-- Calculate tax amounts
UPDATE "InvoiceItem" 
SET "tax_amount" = COALESCE("subtotal", 0) * 0.15
WHERE ("tax_amount" IS NULL OR "tax_amount" = 0) AND "tax_rate" = 15;
