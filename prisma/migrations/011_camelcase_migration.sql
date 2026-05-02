-- ============================================================================
-- MIGRATION: Add columns using CAMELCASE naming (matching existing schema)
-- Date: 2026-05-02
-- Based on invoice_item_view showing columns use camelCase
-- ============================================================================

BEGIN;

-- ============================================================================
-- ADD COLUMNS TO INVOICE TABLE (camelCase)
-- ============================================================================

DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- invoiceType
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'invoiceType'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "invoiceType" VARCHAR(20) DEFAULT 'CUSTOMER';
        RAISE NOTICE 'Added: invoiceType';
    END IF;

    -- customerEmail
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'customerEmail'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "customerEmail" VARCHAR(255);
        RAISE NOTICE 'Added: customerEmail';
    END IF;

    -- dueDate (as TEXT to match invoiceDate format)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'dueDate'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "dueDate" VARCHAR(50);
        RAISE NOTICE 'Added: dueDate';
    END IF;

    -- issuerPhone
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'issuerPhone'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "issuerPhone" VARCHAR(50);
        RAISE NOTICE 'Added: issuerPhone';
    END IF;

    -- issuerEmail
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'issuerEmail'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "issuerEmail" VARCHAR(255);
        RAISE NOTICE 'Added: issuerEmail';
    END IF;

    -- establishmentCode
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'establishmentCode'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "establishmentCode" VARCHAR(10) DEFAULT '0001';
        RAISE NOTICE 'Added: establishmentCode';
    END IF;

    -- pointOfSaleCode
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'pointOfSaleCode'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "pointOfSaleCode" VARCHAR(10) DEFAULT '0001';
        RAISE NOTICE 'Added: pointOfSaleCode';
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

    -- invoiceImageUrl
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'invoiceImageUrl'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE "Invoice" ADD COLUMN "invoiceImageUrl" VARCHAR(500);
        RAISE NOTICE 'Added: invoiceImageUrl';
    END IF;
END $$;

-- ============================================================================
-- ADD COLUMNS TO INVOICEITEM TABLE (camelCase)
-- ============================================================================

DO $$
DECLARE
    col_exists BOOLEAN;
    table_exists BOOLEAN;
BEGIN
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

        -- taxRate
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'InvoiceItem' AND column_name = 'taxRate'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            ALTER TABLE "InvoiceItem" ADD COLUMN "taxRate" FLOAT DEFAULT 15;
            RAISE NOTICE 'Added: InvoiceItem.taxRate';
        END IF;

        -- taxAmount
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'InvoiceItem' AND column_name = 'taxAmount'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            ALTER TABLE "InvoiceItem" ADD COLUMN "taxAmount" FLOAT DEFAULT 0;
            RAISE NOTICE 'Added: InvoiceItem.taxAmount';
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
-- CREATE INDEXES (camelCase columns)
-- ============================================================================

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "idx_invoice_invoiceType" ON "Invoice"("invoiceType");
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "idx_invoice_dueDate" ON "Invoice"("dueDate");
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "idx_invoice_invoiceImageUrl" ON "Invoice"("invoiceImageUrl");
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Index on InvoiceItem using existing column name from the view
DO $$
BEGIN
    -- Based on view: invoiceid AS invoice_id
    CREATE INDEX IF NOT EXISTS "idx_invoiceItem_invoiceid" ON "InvoiceItem"("invoiceid");
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

COMMIT;

-- ============================================================================
-- DATA MIGRATION (camelCase column names)
-- ============================================================================

-- Update due dates (30 days after invoiceDate)
-- Handle both TEXT and TIMESTAMP column types
DO $$
DECLARE
    col_type TEXT;
BEGIN
    -- Check the actual column type
    SELECT data_type INTO col_type
    FROM information_schema.columns 
    WHERE table_name = 'Invoice' AND column_name = 'dueDate';
    
    IF col_type = 'timestamp without time zone' OR col_type = 'timestamp with time zone' THEN
        -- Column is TIMESTAMP, cast the result to timestamp
        UPDATE "Invoice" 
        SET "dueDate" = (to_date("invoiceDate", 'DD/MM/YYYY') + INTERVAL '30 days')::TIMESTAMP
        WHERE "dueDate" IS NULL AND "invoiceDate" IS NOT NULL AND "invoiceDate" <> '';
    ELSE
        -- Column is TEXT/VARCHAR
        UPDATE "Invoice" 
        SET "dueDate" = to_char((to_date("invoiceDate", 'DD/MM/YYYY') + INTERVAL '30 days'), 'DD/MM/YYYY')
        WHERE "dueDate" IS NULL AND "invoiceDate" IS NOT NULL AND "invoiceDate" <> '';
    END IF;
END $$;

-- Update tax from totalTax (or total_tax if exists)
DO $$
BEGIN
    -- Try camelCase first
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'totalTax'
    ) THEN
        UPDATE "Invoice" SET "tax" = "totalTax" 
        WHERE ("tax" IS NULL OR "tax" = 0) AND "totalTax" IS NOT NULL;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'total_tax'
    ) THEN
        UPDATE "Invoice" SET "tax" = "total_tax" 
        WHERE ("tax" IS NULL OR "tax" = 0) AND "total_tax" IS NOT NULL;
    END IF;
END $$;

-- Update InvoiceItem totals (using column names from the view)
-- View shows: totalamount AS subtotal, so totalamount is the existing column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'InvoiceItem' AND column_name = 'totalamount'
    ) THEN
        UPDATE "InvoiceItem" 
        SET "total" = "totalamount"
        WHERE ("total" IS NULL OR "total" = 0);
    END IF;
END $$;

-- Update tax amounts
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'InvoiceItem' AND column_name = 'taxamount'
    ) THEN
        UPDATE "InvoiceItem" 
        SET "taxAmount" = "taxamount"
        WHERE ("taxAmount" IS NULL OR "taxAmount" = 0);
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'InvoiceItem' AND column_name = 'subtotal'
    ) THEN
        UPDATE "InvoiceItem" 
        SET "taxAmount" = "subtotal" * 0.15
        WHERE ("taxAmount" IS NULL OR "taxAmount" = 0);
    END IF;
END $$;
