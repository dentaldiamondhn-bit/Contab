-- ============================================================================
-- DIAGNOSTIC: Check current table structure
-- Date: 2026-05-02
-- Run this first to see what columns actually exist
-- ============================================================================

-- Check Invoice table columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Invoice' 
ORDER BY ordinal_position;

-- Check InvoiceItem table columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'InvoiceItem' 
ORDER BY ordinal_position;

-- Check existing indexes on Invoice
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'Invoice';

-- Check existing indexes on InvoiceItem
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'InvoiceItem';

-- Check for views that might block changes
SELECT viewname, definition 
FROM pg_views 
WHERE viewname LIKE '%invoice%';

-- Sample data from Invoice (first 5 rows, selected columns)
SELECT * FROM "Invoice" LIMIT 5;

-- Sample data from InvoiceItem (first 5 rows)
SELECT * FROM "InvoiceItem" LIMIT 5;

-- Count invoices by type (if column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'invoice_type'
    ) THEN
        RAISE NOTICE 'Invoice types distribution:';
        -- This won't show in output but you can run separately
    END IF;
END $$;
