-- Migration: Ensure InvoiceItem table has all necessary fields
-- Created: 2026-05-02

-- Add missing fields to InvoiceItem if they don't exist
DO $$
BEGIN
    -- Check if column exists before adding
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='InvoiceItem' AND column_name='tax_rate') THEN
        ALTER TABLE "InvoiceItem" ADD COLUMN "tax_rate" FLOAT DEFAULT 15;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='InvoiceItem' AND column_name='tax_amount') THEN
        ALTER TABLE "InvoiceItem" ADD COLUMN "tax_amount" FLOAT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='InvoiceItem' AND column_name='total') THEN
        ALTER TABLE "InvoiceItem" ADD COLUMN "total" FLOAT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='InvoiceItem' AND column_name='description') THEN
        ALTER TABLE "InvoiceItem" ADD COLUMN "description" TEXT;
    END IF;
END $$;

-- Create index on invoice_id for faster joins
CREATE INDEX IF NOT EXISTS "idx_invoice_item_invoice_id" ON "InvoiceItem"("invoice_id");

-- Comments
COMMENT ON COLUMN "InvoiceItem"."tax_rate" IS 'ISV tax rate percentage (default 15%)';
COMMENT ON COLUMN "InvoiceItem"."tax_amount" IS 'Calculated tax amount';
COMMENT ON COLUMN "InvoiceItem"."total" IS 'Total including tax';
COMMENT ON COLUMN "InvoiceItem"."description" IS 'Item description for CUSTOMER and EXPENSE invoices';
