-- ============================================================================
-- ROLLBACK: Complete Invoice System Migration
-- Date: 2026-05-02
-- Description: Reverts all changes from 007_complete_invoice_system_migration.sql
-- WARNING: This will delete data in the new columns!
-- ============================================================================

-- Start transaction
BEGIN;

-- ============================================================================
-- 1. DROP INDEXES
-- ============================================================================

DROP INDEX IF EXISTS "idx_invoice_type";
DROP INDEX IF EXISTS "idx_invoice_number_search";
DROP INDEX IF EXISTS "idx_invoice_due_date";
DROP INDEX IF EXISTS "idx_invoice_item_invoice_id";
DROP INDEX IF EXISTS "idx_invoice_tenant_type_status";

-- ============================================================================
-- 2. DROP CONSTRAINTS
-- ============================================================================

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "chk_invoice_type";
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "chk_invoice_status";

-- ============================================================================
-- 3. DROP VIEW
-- ============================================================================

DROP VIEW IF EXISTS "InvoiceSummary";

-- ============================================================================
-- 4. DROP COLUMNS FROM INVOICE TABLE
-- ============================================================================

ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "invoice_type";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "customer_email";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "due_date";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "issuer_phone";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "issuer_email";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "establishment_code";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "point_of_sale_code";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "tax";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "invoice_image_url";

-- ============================================================================
-- 5. REVERT INVOICEITEM CHANGES
-- ============================================================================

-- Remove columns
ALTER TABLE "InvoiceItem" DROP COLUMN IF EXISTS "description";
ALTER TABLE "InvoiceItem" DROP COLUMN IF EXISTS "tax_rate";
ALTER TABLE "InvoiceItem" DROP COLUMN IF EXISTS "tax_amount";
ALTER TABLE "InvoiceItem" DROP COLUMN IF EXISTS "total";

-- Note: Making columns NOT NULL again might fail if there are null values
-- You may need to update data first or drop and recreate the table

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;
