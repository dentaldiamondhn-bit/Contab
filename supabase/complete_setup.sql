-- =============================================
-- CONTAB - Script SQL completo para Supabase
-- Ejecutar en el SQL Editor de Supabase Dashboard
-- =============================================

-- =============================================
-- 1. Tabla: auditlog
-- Registro de auditoria de cambios en el sistema
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

CREATE INDEX IF NOT EXISTS idx_auditlog_timestamp ON auditlog ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_auditlog_tenant    ON auditlog (tenantid);
CREATE INDEX IF NOT EXISTS idx_auditlog_action    ON auditlog (action);
CREATE INDEX IF NOT EXISTS idx_auditlog_tablename ON auditlog (tablename);

ALTER TABLE auditlog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON auditlog;
CREATE POLICY "Authenticated users can read audit logs"
  ON auditlog FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT INSERT ON auditlog TO service_role;
GRANT SELECT ON auditlog TO authenticated;

-- =============================================
-- 2. Tabla: SupportTicket
-- Tickets de soporte tecnico
-- =============================================
CREATE TABLE IF NOT EXISTS "SupportTicket" (
  id            TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  subject       TEXT NOT NULL,
  description   TEXT,
  priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ticket_type   TEXT NOT NULL DEFAULT 'support' CHECK (ticket_type IN ('support', 'bug', 'feature', 'question', 'billing')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  user_email    TEXT NOT NULL,
  user_name     TEXT,
  tenant_name   TEXT,
  tenant_code   TEXT,
  tenant_id     TEXT REFERENCES "Tenant"("id"),
  assigned_to   TEXT,
  assigned_name TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_status ON "SupportTicket" (status);
CREATE INDEX IF NOT EXISTS idx_support_ticket_priority ON "SupportTicket" (priority);
CREATE INDEX IF NOT EXISTS idx_support_ticket_tenant ON "SupportTicket" (tenant_id);

ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read support tickets" ON "SupportTicket";
CREATE POLICY "Authenticated users can read support tickets"
  ON "SupportTicket" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "SupportTicket" TO service_role;
GRANT SELECT, INSERT, UPDATE ON "SupportTicket" TO authenticated;
