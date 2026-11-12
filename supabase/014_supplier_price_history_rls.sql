-- 014: RLS Policies for supplier_price_history table
-- Policies follow the same pattern as other tables (tenant_id isolation)
-- Based on: SELECT tenantid FROM "User" WHERE authid = auth.uid()::TEXT

-- Enable RLS on the table
ALTER TABLE "supplier_price_history" ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can view their own price history
CREATE POLICY "Tenants can view own supplier price history" ON "supplier_price_history"
  FOR SELECT USING (tenant_id = (SELECT tenantid FROM "User" WHERE authid = auth.uid()::TEXT));

-- Policy: Tenants can insert their own price history
CREATE POLICY "Tenants can insert own supplier price history" ON "supplier_price_history"
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenantid FROM "User" WHERE authid = auth.uid()::TEXT));

-- Policy: Tenants can update their own price history
CREATE POLICY "Tenants can update own supplier price history" ON "supplier_price_history"
  FOR UPDATE USING (tenant_id = (SELECT tenantid FROM "User" WHERE authid = auth.uid()::TEXT))
  WITH CHECK (tenant_id = (SELECT tenantid FROM "User" WHERE authid = auth.uid()::TEXT));

-- Policy: Tenants can delete their own price history
CREATE POLICY "Tenants can delete own supplier price history" ON "supplier_price_history"
  FOR DELETE USING (tenant_id = (SELECT tenantid FROM "User" WHERE authid = auth.uid()::TEXT));

-- Index for RLS performance (if not already created)
CREATE INDEX IF NOT EXISTS "idx_supplier_price_history_tenant_rls" ON "supplier_price_history" ("tenant_id");