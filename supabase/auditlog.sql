-- =============================================
-- Tabla: auditlog
-- Propósito: Registro de auditoría de cambios en el sistema
-- Usado por: /support/audit y /api/audit-logs
-- =============================================

CREATE TABLE IF NOT EXISTS auditlog (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tablename     TEXT NOT NULL,
  recordid      TEXT NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  oldvalues     JSONB,
  newvalues     JSONB,
  changedfields JSONB,
  userid        TEXT,
  useragent     TEXT,
  ipaddress     TEXT,
  tenantid      TEXT REFERENCES "Tenant"("id"),
  "timestamp"   TIMESTAMPTZ DEFAULT now()
);

-- Índices para filtros comunes
CREATE INDEX IF NOT EXISTS idx_auditlog_timestamp ON auditlog ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_auditlog_tenant    ON auditlog (tenantid);
CREATE INDEX IF NOT EXISTS idx_auditlog_action    ON auditlog (action);
CREATE INDEX IF NOT EXISTS idx_auditlog_tablename ON auditlog (tablename);

-- RLS
ALTER TABLE auditlog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read audit logs"
  ON auditlog FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT INSERT ON auditlog TO service_role;
GRANT SELECT ON auditlog TO authenticated;
