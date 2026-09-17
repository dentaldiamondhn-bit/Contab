-- Create TenantCompensation table
CREATE TABLE IF NOT EXISTS "TenantCompensation" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenantid TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- EXTEND_DAYS, CREDIT, CHANGE_PLAN
  days INTEGER DEFAULT 0,
  amount INTEGER DEFAULT 0,
  description TEXT NOT NULL,
  reason TEXT,
  createdby TEXT,
  createdat TIMESTAMPTZ DEFAULT NOW(),
  updatedat TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compensation_tenant ON "TenantCompensation"(tenantid);
CREATE INDEX IF NOT EXISTS idx_compensation_type ON "TenantCompensation"(type);

-- RLS
ALTER TABLE "TenantCompensation" ENABLE ROW LEVEL SECURITY;
