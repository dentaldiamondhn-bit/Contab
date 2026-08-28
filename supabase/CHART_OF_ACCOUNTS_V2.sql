-- =============================================
-- Migración: Agregar columnas profesionales a chart_of_accounts
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Columnas adicionales para catálogo profesional
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS nature TEXT DEFAULT 'DEBIT';
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS is_selectable BOOLEAN DEFAULT true;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'HNL';
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS fiscal_code TEXT DEFAULT '';
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Columna para tracking de quién editó
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS last_edited_by TEXT DEFAULT '';

-- Tabla de auditoría de cuentas contables
CREATE TABLE IF NOT EXISTS account_audit_log (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT NOT NULL,
  account_id  TEXT NOT NULL,
  account_code TEXT NOT NULL,
  action      TEXT NOT NULL,
  old_values  JSONB DEFAULT '{}',
  new_values  JSONB DEFAULT '{}',
  performed_by TEXT DEFAULT '',
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para account_audit_log
ALTER TABLE account_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on account_audit_log" ON account_audit_log;
CREATE POLICY "Allow all for service_role on account_audit_log"
  ON account_audit_log FOR ALL
  USING (auth.role() = 'service_role');

GRANT ALL ON account_audit_log TO service_role;
GRANT SELECT ON account_audit_log TO authenticated;
