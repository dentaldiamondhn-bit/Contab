CREATE TABLE IF NOT EXISTS payroll_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  closing_month INT NOT NULL,
  closing_year INT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, employee_id, closing_month, closing_year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_uploads_period ON payroll_uploads(tenant_id, closing_month, closing_year);

ALTER TABLE payroll_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON payroll_uploads
  USING (tenant_id = current_setting('app.current_tenant', true));

GRANT ALL ON payroll_uploads TO authenticated;
GRANT ALL ON payroll_uploads TO service_role;
