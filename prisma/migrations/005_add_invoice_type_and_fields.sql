-- Migration: Add invoice type and additional fields for legal invoice format
-- Created: 2026-05-02

-- Add invoice type enum (CUSTOMER, SUBSCRIPTION, EXPENSE)
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "invoice_type" VARCHAR(20) DEFAULT 'CUSTOMER';

-- Add customer email field
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "customer_email" VARCHAR(255);

-- Add issuer phone and email
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "issuer_phone" VARCHAR(50);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "issuer_email" VARCHAR(255);

-- Add establishment and point of sale codes for legal format
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "establishment_code" VARCHAR(10) DEFAULT '0001';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "point_of_sale_code" VARCHAR(10) DEFAULT '0001';

-- Add invoice image/document attachment
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "invoice_image_url" VARCHAR(500);

-- Add tax field (separated from totalTax for clarity)
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "tax" FLOAT DEFAULT 0;

-- Add due date field
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP;

-- Create index on invoice type for faster filtering
CREATE INDEX IF NOT EXISTS "idx_invoice_type" ON "Invoice"("invoice_type");

-- Create index on invoice number for faster search
CREATE INDEX IF NOT EXISTS "idx_invoice_number_search" ON "Invoice"("invoice_number");

-- Update existing records to have a due date (30 days after invoice date)
UPDATE "Invoice" SET "due_date" = "invoice_date" + INTERVAL '30 days' WHERE "due_date" IS NULL;

-- Update existing records to set tax from totalTax
UPDATE "Invoice" SET "tax" = "total_tax" WHERE "tax" = 0 OR "tax" IS NULL;

-- Add constraint for invoice type values
ALTER TABLE "Invoice" ADD CONSTRAINT "chk_invoice_type" 
  CHECK ("invoice_type" IN ('CUSTOMER', 'SUBSCRIPTION', 'EXPENSE'));

-- Comment explaining the migration
COMMENT ON COLUMN "Invoice"."invoice_type" IS 'Type of invoice: CUSTOMER (tenant to customer), SUBSCRIPTION (ContabHN to tenant), EXPENSE (tenant received from supplier)';
COMMENT ON COLUMN "Invoice"."customer_email" IS 'Customer email for sending invoice';
COMMENT ON COLUMN "Invoice"."issuer_phone" IS 'Issuer phone number for legal invoice format';
COMMENT ON COLUMN "Invoice"."issuer_email" IS 'Issuer email for legal invoice format';
COMMENT ON COLUMN "Invoice"."invoice_image_url" IS 'URL to attached invoice image/document';
