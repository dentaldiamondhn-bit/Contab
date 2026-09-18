-- ============================================
-- OUTBOX PATTERN para logs de auditoría
-- Evita que el audit_log bloquee transacciones contables de alta concurrencia
-- Tabla: audit_outbox (mapeada desde Prisma AuditOutbox model)
-- ============================================

-- 1. Crear la tabla audit_outbox para cola de logs de auditoría
CREATE TABLE IF NOT EXISTS audit_outbox (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id       TEXT NOT NULL,
  table_name      TEXT NOT NULL,
  record_id       TEXT NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  old_values      JSONB,
  new_values      JSONB,
  changed_fields  JSONB,
  user_id         TEXT,
  user_agent      TEXT,
  ip_address      TEXT,
  category        TEXT NOT NULL DEFAULT 'DATA_CHANGE',
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  processed_at    TIMESTAMPTZ
);

-- Índices para procesamiento eficiente
CREATE INDEX IF NOT EXISTS idx_audit_outbox_tenant ON audit_outbox (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_outbox_status ON audit_outbox (status);
CREATE INDEX IF NOT EXISTS idx_audit_outbox_created ON audit_outbox (created_at ASC) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_audit_outbox_table ON audit_outbox (table_name, created_at DESC);

-- Habilitar RLS en la tabla
ALTER TABLE audit_outbox ENABLE ROW LEVEL SECURITY;

-- Policy: service_role tiene acceso completo
GRANT ALL ON audit_outbox TO service_role;

-- Policy: Lectura para roles autenticados (solo logs procesados)
CREATE POLICY "audit_outbox_read_policy" ON audit_outbox FOR SELECT
  USING (status = 'PROCESSED');

-- Policy: Los usuarios autenticados pueden insertar
CREATE POLICY "audit_outbox_insert_policy" ON audit_outbox FOR INSERT
  WITH CHECK (true);

-- 2. Trigger para insertar automáticamente en audit_outbox cuando hay cambios en tablas auditadas

-- Trigger para la tabla "Transaction"
CREATE OR REPLACE FUNCTION trigger_transaction_audit()
RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_outbox (tenant_id, table_name, record_id, action, old_values, new_values, changed_fields, user_id, user_agent, ip_address, category, description, status)
  VALUES (
    COALESCE(current_setting('request.jwt.claims', true)::json->>'tenant_id', ''),
    'Transaction',
    COALESCE(NEW.id::text, OLD.id::text),
    TG_OP::text,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END,
    NULL,
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.user-agent', true),
    current_setting('request.remote_addr', true),
    'DATA_CHANGE',
    TG_OP || ' on Transaction',
    'PENDING'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Transaction"
FOR EACH ROW EXECUTE FUNCTION trigger_transaction_audit();

-- Trigger para la tabla "JournalEntry"
CREATE OR REPLACE FUNCTION trigger_journalentry_audit()
RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_outbox (tenant_id, table_name, record_id, action, old_values, new_values, changed_fields, user_id, user_agent, ip_address, category, description, status)
  VALUES (
    COALESCE(current_setting('request.jwt.claims', true)::json->>'tenant_id', ''),
    'JournalEntry',
    COALESCE(NEW.id::text, OLD.id::text),
    TG_OP::text,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END,
    NULL,
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.user-agent', true),
    current_setting('request.remote_addr', true),
    'DATA_CHANGE',
    TG_OP || ' on JournalEntry',
    'PENDING'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journalentry_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION trigger_journalentry_audit();

-- Trigger para la tabla "Account"
CREATE OR REPLACE FUNCTION trigger_account_audit()
RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_outbox (tenant_id, table_name, record_id, action, old_values, new_values, changed_fields, user_id, user_agent, ip_address, category, description, status)
  VALUES (
    COALESCE(current_setting('request.jwt.claims', true)::json->>'tenant_id', ''),
    'Account',
    COALESCE(NEW.id::text, OLD.id::text),
    TG_OP::text,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END,
    NULL,
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.user-agent', true),
    current_setting('request.remote_addr', true),
    'DATA_CHANGE',
    TG_OP || ' on Account',
    'PENDING'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Account"
FOR EACH ROW EXECUTE FUNCTION trigger_account_audit();

-- 3. Función para procesar la outbox (ejecutar como job/cron o worker)
-- Toma registros PENDING y los escribe en audit_log
CREATE OR REPLACE FUNCTION process_audit_outbox()
RETURNS TABLE(processed_count integer, failed_count integer) AS $$
DECLARE
  batch_record RECORD;
  processed integer := 0;
  failed integer := 0;
BEGIN
  FOR batch_record IN
    SELECT id, tenant_id, table_name, record_id, action, old_values, new_values, changed_fields, user_id, user_agent, ip_address, category, description
    FROM audit_outbox
    WHERE status = 'PENDING'
    ORDER BY created_at ASC
    LIMIT 100
  LOOP
    BEGIN
      INSERT INTO audit_log (tenant_id, table_name, record_id, action, old_values, new_values, changed_fields, user_id, user_agent, ip_address, category, description)
      VALUES (
        batch_record.tenant_id,
        batch_record.table_name,
        batch_record.record_id,
        batch_record.action,
        batch_record.old_values,
        batch_record.new_values,
        batch_record.changed_fields,
        batch_record.user_id,
        batch_record.user_agent,
        batch_record.ip_address,
        batch_record.category,
        batch_record.description
      );

      UPDATE audit_outbox
      SET status = 'PROCESSED', processed_at = now()
      WHERE id = batch_record.id;

      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE audit_outbox
      SET status = 'FAILED'
      WHERE id = batch_record.id;
      failed := failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT processed, failed;
END;
$$ LANGUAGE plpgsql;

-- 4. Ejecutar procesamiento (cron o manual)
-- SELECT * FROM process_audit_outbox();

-- 5. Limpiar outbox antiguo (opcional, ejecutar con cron)
-- DELETE FROM audit_outbox WHERE status = 'PROCESSED' AND created_at < now() - interval '30 days';
