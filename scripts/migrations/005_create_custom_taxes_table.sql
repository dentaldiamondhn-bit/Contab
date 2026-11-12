-- Create CustomTaxes table for storing custom tax configurations
-- This table allows tenants to create and manage custom tax rates beyond standard ISV

CREATE TABLE IF NOT EXISTS "CustomTaxes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint to ensure tenant isolation
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

-- Create index for faster tenant-specific queries
CREATE INDEX IF NOT EXISTS "idx_custom_taxes_tenant_id" ON "CustomTaxes"("tenantId");

-- Create index for enabled status filtering
CREATE INDEX IF NOT EXISTS "idx_custom_taxes_enabled" ON "CustomTaxes"("tenantId", "enabled");

-- Add RLS (Row Level Security) policies
ALTER TABLE "CustomTaxes" ENABLE ROW LEVEL SECURITY;

-- Policy to allow tenants to read their own custom taxes
CREATE POLICY "Tenants can read own custom taxes" ON "CustomTaxes"
    FOR SELECT USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- Policy to allow tenants to insert their own custom taxes
CREATE POLICY "Tenants can insert own custom taxes" ON "CustomTaxes"
    FOR INSERT WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

-- Policy to allow tenants to update their own custom taxes
CREATE POLICY "Tenants can update own custom taxes" ON "CustomTaxes"
    FOR UPDATE USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- Policy to allow tenants to delete their own custom taxes
CREATE POLICY "Tenants can delete own custom taxes" ON "CustomTaxes"
    FOR DELETE USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- Create trigger to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_custom_taxes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "update_custom_taxes_updated_at_trigger"
    BEFORE UPDATE ON "CustomTaxes"
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_taxes_updated_at();
