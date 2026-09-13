-- Migración: Crear tabla de plantillas de asientos contables
-- Permite guardar y reutilizar estructuras de pólizas frecuentes

CREATE TABLE IF NOT EXISTS journal_entry_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  voucher_type TEXT NOT NULL DEFAULT 'DIARIO',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entry_template_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES journal_entry_templates(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit_enabled BOOLEAN DEFAULT true,
  credit_enabled BOOLEAN DEFAULT true,
  default_amount BIGINT DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_je_templates_tenant ON journal_entry_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_je_template_lines_template ON journal_entry_template_lines(template_id);

-- RLS
ALTER TABLE journal_entry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_template_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_templates" ON journal_entry_templates
  USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

CREATE POLICY "tenant_isolation_template_lines" ON journal_entry_template_lines
  USING (template_id IN (
    SELECT id FROM journal_entry_templates
    WHERE tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  ));

-- service_role access
CREATE POLICY "service_role_all_templates" ON journal_entry_templates
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "service_role_all_template_lines" ON journal_entry_template_lines
  FOR ALL USING (current_setting('role') = 'service_role');
