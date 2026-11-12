-- =============================================
-- Tabla: SupportTicket
-- Propósito: Tickets de soporte técnico
-- Usado por: /support/tickets y /api/support/tickets
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

CREATE POLICY "Authenticated users can read support tickets"
  ON "SupportTicket" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "SupportTicket" TO service_role;
GRANT SELECT, INSERT, UPDATE ON "SupportTicket" TO authenticated;
