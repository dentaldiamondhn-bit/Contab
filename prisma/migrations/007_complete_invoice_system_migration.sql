-- ============================================================================
-- MIGRATION: Complete Invoice System with Type Support (CUSTOMER/SUBSCRIPTION/EXPENSE)
-- Date: 2026-05-02
-- Description: Adds all necessary fields for the three invoice types system
-- ============================================================================

-- Start transaction
BEGIN;

-- ============================================================================
-- 1. ADD NEW COLUMNS TO INVOICE TABLE
-- ============================================================================

-- Invoice type (CUSTOMER, SUBSCRIPTION, EXPENSE)
ALTER TABLE "Invoice" 
ADD COLUMN IF NOT EXISTS "invoice_type" VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER';

-- Customer email for sending invoices
ALTER TABLE "Invoice" 
ADD COLUMN IF NOT EXISTS "customer_email" VARCHAR(255);

-- Due date for payment tracking
ALTER TABLE "Invoice" 
ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP;

-- Issuer contact information
ALTER TABLE "Invoice" 
ADD COLUMN IF NOT EXISTS "issuer_phone" VARCHAR(50);

ALTER TABLE "Invoice" 
ADD COLUMN IF NOT EXISTS "issuer_email" VARCHAR(255);

-- Legal invoice format codes
ALTER TABLE "Invoice" 
ADD COLUMN IF NOT EXISTS "establishment_code" VARCHAR(10) NOT NULL DEFAULT '0001';

ALTER TABLE "Invoice" 
ADD COLUMN IF NOT EXISTS "point_of_sale_code" VARCHAR(10) NOT NULL DEFAULT '0001';

-- Tax amount (separate from totalTax for clarity)
ALTER TABLE "Invoice" 
ADD COLUMN IF NOT EXISTS "tax" FLOAT DEFAULT 0;

-- Invoice image/document URL for attachments
ALTER TABLE "Invoice" 
ADD COLUMN IF NOT EXISTS "invoice_image_url" VARCHAR(500);

-- ============================================================================
-- 2. UPDATE INVOICEITEM TABLE
-- ============================================================================

-- Make planId optional (for CUSTOMER and EXPENSE invoices that don't have plans)
ALTER TABLE "InvoiceItem" 
ALTER COLUMN "plan_id" DROP NOT NULL;

-- Make planName optional
ALTER TABLE "InvoiceItem" 
ALTER COLUMN "plan_name" DROP NOT NULL;

-- Add description field for custom items
ALTER TABLE "InvoiceItem" 
ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Add tax calculation fields
ALTER TABLE "InvoiceItem" 
ADD COLUMN IF NOT EXISTS "tax_rate" FLOAT DEFAULT 15;

ALTER TABLE "InvoiceItem" 
ADD COLUMN IF NOT EXISTS "tax_amount" FLOAT DEFAULT 0;

-- Add total field (subtotal + tax)
ALTER TABLE "InvoiceItem" 
ADD COLUMN IF NOT EXISTS "total" FLOAT DEFAULT 0;

-- Change unitPrice to Float for decimal support
-- Note: This may require data migration depending on your database
-- ALTER TABLE "InvoiceItem" 
-- ALTER COLUMN "unit_price" TYPE FLOAT;

-- Change subtotal to Float
-- ALTER TABLE "InvoiceItem" 
-- ALTER COLUMN "subtotal" TYPE FLOAT;

-- Add default quantity
ALTER TABLE "InvoiceItem" 
ALTER COLUMN "quantity" SET DEFAULT 1;

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on invoice type for filtering
CREATE INDEX IF NOT EXISTS "idx_invoice_type" 
ON "Invoice"("invoice_type");

-- Index on invoice number for search
CREATE INDEX IF NOT EXISTS "idx_invoice_number_search" 
ON "Invoice"("invoice_number");

-- Index on due date for overdue queries
CREATE INDEX IF NOT EXISTS "idx_invoice_due_date" 
ON "Invoice"("due_date");

-- Index on invoice items for joins
CREATE INDEX IF NOT EXISTS "idx_invoice_item_invoice_id" 
ON "InvoiceItem"("invoice_id");

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS "idx_invoice_tenant_type_status" 
ON "Invoice"("tenant_id", "invoice_type", "status");

-- ============================================================================
-- 4. ADD CONSTRAINTS
-- ============================================================================

-- Add check constraint for invoice type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_invoice_type' 
        AND conrelid = '"Invoice"'::regclass
    ) THEN
        ALTER TABLE "Invoice" 
        ADD CONSTRAINT "chk_invoice_type" 
        CHECK ("invoice_type" IN ('CUSTOMER', 'SUBSCRIPTION', 'EXPENSE'));
    END IF;
END $$;

-- Add check constraint for status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_invoice_status' 
        AND conrelid = '"Invoice"'::regclass
    ) THEN
        ALTER TABLE "Invoice" 
        ADD CONSTRAINT "chk_invoice_status" 
        CHECK ("status" IN ('ACTIVE', 'PAID', 'PENDING', 'OVERDUE', 'CANCELLED'));
    END IF;
END $$;

-- ============================================================================
-- 5. UPDATE EXISTING DATA
-- ============================================================================

-- Set due date for existing invoices (30 days after invoice date)
UPDATE "Invoice" 
SET "due_date" = "invoice_date" + INTERVAL '30 days' 
WHERE "due_date" IS NULL;

-- Set tax from totalTax for existing records
UPDATE "Invoice" 
SET "tax" = "total_tax" 
WHERE "tax" = 0 OR "tax" IS NULL;

-- Calculate total for InvoiceItems if null
UPDATE "InvoiceItem" 
SET "total" = "subtotal" + COALESCE("tax_amount", 0)
WHERE "total" = 0 OR "total" IS NULL;

-- Set default tax amount if null (15% of subtotal)
UPDATE "InvoiceItem" 
SET "tax_amount" = "subtotal" * 0.15
WHERE "tax_amount" = 0 OR "tax_amount" IS NULL;

-- ============================================================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN "Invoice"."invoice_type" IS 
'Type of invoice: CUSTOMER (tenant to customer), SUBSCRIPTION (ContabHN to tenant), EXPENSE (tenant received from supplier)';

COMMENT ON COLUMN "Invoice"."customer_email" IS 
'Customer email for sending invoice notifications';

COMMENT ON COLUMN "Invoice"."due_date" IS 
'Payment due date. Invoices overdue after this date';

COMMENT ON COLUMN "Invoice"."issuer_phone" IS 
'Issuer phone number for legal invoice format (SAR-HN)';

COMMENT ON COLUMN "Invoice"."issuer_email" IS 
'Issuer email for legal invoice format (SAR-HN)';

COMMENT ON COLUMN "Invoice"."establishment_code" IS 
'Establishment code for legal invoice format (SAR-HN)';

COMMENT ON COLUMN "Invoice"."point_of_sale_code" IS 
'Point of sale code for legal invoice format (SAR-HN)';

COMMENT ON COLUMN "Invoice"."tax" IS 
'ISV tax amount (15% of subtotal) for tax breakdown display';

COMMENT ON COLUMN "Invoice"."invoice_image_url" IS 
'URL to attached invoice image or document (for EXPENSE type invoices)';

COMMENT ON COLUMN "InvoiceItem"."description" IS 
'Item description. Used for CUSTOMER and EXPENSE invoices';

COMMENT ON COLUMN "InvoiceItem"."tax_rate" IS 
'ISV tax rate percentage (default 15% for Honduras)';

COMMENT ON COLUMN "InvoiceItem"."tax_amount" IS 
'Calculated tax amount based on tax_rate';

COMMENT ON COLUMN "InvoiceItem"."total" IS 
'Total amount including tax (subtotal + tax_amount)';

-- ============================================================================
-- 7. CREATE VIEW FOR ADMIN REPORTS (Optional)
-- ============================================================================

CREATE OR REPLACE VIEW "InvoiceSummary" AS
SELECT 
    i.*,
    t."businessname" as "tenant_name",
    t."businessrtn" as "tenant_rtn",
    COUNT(ii.id) as "item_count",
    CASE 
        WHEN i."invoice_type" = 'CUSTOMER' THEN 'Factura Emitida'
        WHEN i."invoice_type" = 'SUBSCRIPTION' THEN 'Suscripción'
        WHEN i."invoice_type" = 'EXPENSE' THEN 'Factura Recibida'
        ELSE i."invoice_type"
    END as "invoice_type_label"
FROM "Invoice" i
LEFT JOIN "Tenant" t ON i."tenant_id" = t.id
LEFT JOIN "InvoiceItem" ii ON i.id = ii."invoice_id"
GROUP BY i.id, t."businessname", t."businessrtn";

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the migration)
-- ============================================================================

-- Check new columns exist
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'Invoice' 
-- ORDER BY ordinal_position;

-- Check invoice type distribution
-- SELECT "invoice_type", COUNT(*) 
-- FROM "Invoice" 
-- GROUP BY "invoice_type";

-- Verify indexes were created
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'Invoice';
