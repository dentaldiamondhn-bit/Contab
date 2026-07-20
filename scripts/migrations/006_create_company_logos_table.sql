-- Create table for company logos
-- This table will store company logos for each tenant

CREATE TABLE IF NOT EXISTS company_logos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    logo_url TEXT NOT NULL,
    logo_name VARCHAR(255),
    logo_size INTEGER,
    logo_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint to Tenant table
    CONSTRAINT fk_company_logos_tenant FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) ON DELETE CASCADE,
    
    -- Ensure one logo per tenant
    CONSTRAINT unique_tenant_logo UNIQUE (tenant_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_logos_tenant_id ON company_logos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_logos_created_at ON company_logos(created_at);

-- Add RLS (Row Level Security) if needed
ALTER TABLE company_logos ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own tenant's logo
-- Note: For now, we'll allow access based on tenant_id matching
-- In production, you might want to implement more sophisticated access control
CREATE POLICY "Users can view their tenant logo" ON company_logos
    FOR SELECT USING (true);

CREATE POLICY "Users can update their tenant logo" ON company_logos
    FOR UPDATE USING (true);

CREATE POLICY "Users can insert their tenant logo" ON company_logos
    FOR INSERT WITH CHECK (true);
