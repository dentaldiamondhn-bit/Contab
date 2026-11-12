-- 014: Supplier Price History table
-- Creates table to track price history per supplier per product

-- 1. Create supplier_price_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS "supplier_price_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "product_id" TEXT,
  "price" DECIMAL(18, 4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'HNL',
  "effective_date" TIMESTAMPTZ NOT NULL,
  "expiry_date" TIMESTAMPTZ,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance and tenant isolation
CREATE INDEX IF NOT EXISTS "idx_supplier_price_tenant" ON "supplier_price_history" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_price_supplier" ON "supplier_price_history" ("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_price_product" ON "supplier_price_history" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_price_effective" ON "supplier_price_history" ("effective_date");

-- Backfill: set effective_date to created_at if null (for any existing rows, though none should exist)
UPDATE "supplier_price_history" SET "effective_date" = "created_at" WHERE "effective_date" IS NULL;

-- 2. Add used/usedat to existing tables if missing (idempotent migration)
-- No existing columns to add in this migration step