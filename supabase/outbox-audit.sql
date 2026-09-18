-- ============================================
-- OUTBOX PATTERN para logs de auditoría
-- Evita que el account_audit_log bloquee transacciones contables de alta concurrencia
-- ============================================

-- 1. Crear la tabla outbox para colequeue de logs de auditoría
CREATE TABLE IF NOT EXISTS outbox_audit (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tablename   TEXT NOT NULL,
  recordid    TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  oldvalues   JSONB,
  newvalues   JSONB,
  changedfields JSONB,
  userid      TEXT,
  useragent   TEXT,
  ipaddress   TEXT,
  tenantid    TEXT,
  "timestamp" TIMESTAMPTZ DEFAULT now(),
  processed   BOOLEAN DEFAULT FALSE,
  retry_count INTEGER DEFAULT 0
);

-- Índices para procesamiento eficiente
CREATE INDEX IF NOT EXISTS idx_outbox_processed ON outbox_audit (processed, "timestamp" ASC);
CREATE INDEX IF NOT EXISTS idx_outbox_tenant ON outbox_audit (tenantid, processed);
CREATE INDEX IF NOT EXISTS idx_outbox_tablename ON outbox_audit (tablename, processed);

-- Habilitar RLS en la tabla outbox
ALTER TABLE outbox_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Solo service_role puede insertar y marcar como procesado
GRANT ALL ON outbox_audit TO service_role;

-- Policy: Lectura para roles autenticados (solo logs procesados)
CREATE POLICY "outbox_read_policy" ON outbox_audit FOR SELECT
  USING (processed = TRUE);

-- Policy: Los usuarios autenticados pueden insertar sus propios contexto (opcional)
-- Esto permite que la aplicación inserte en la outbox sin necesidad del service_role en el hilo principal
CREATE POLICY "outbox_insert_policy" ON outbox_audit FOR INSERT
  WITH CHECK (true);

-- 2. Función para procesar la outbox (ejecutar como job/cron o worker)
-- Esta función toma los registros no procesados y los escribe en auditlog
CREATE OR REPLACE FUNCTION process_outbox_audit()
RETURNS VOID AS $$
DECLARE
  batch_outbox RECORD;
BEGIN
  -- Procesar lote de registros no procesados (máximo 100 por lote)
  FOR batch_outbox IN
    SELECT id, tablename, recordid, action, oldvalues, newvalues, changedfields, userid, useragent, ipaddress, tenantid
    FROM outbox_audit
    WHERE processed = FALSE
    ORDER BY "timestamp" ASC
    LIMIT 100
  LOOP
    -- Insertar en auditlog
    INSERT INTO auditlog (id, tablename, recordid, action, oldvalues, newvalues, changedfields, userid, useragent, ipaddress, tenantid, "timestamp")
    VALUES (
      batch_outbox.id,
      batch_outbox.tablename,
      batch_outbox.recordid,
      batch_outbox.action,
      batch_outbox.oldvalues,
      batch_outbox.newvalues,
      batch_outbox.changedfields,
      batch_outbox.userid,
      batch_outbox.useragent,
      batch_outbox.ipaddress,
      batch_outbox.tenantid,
      now()
    );

    -- Marcar como procesado
    UPDATE outbox_audit
    SET processed = TRUE
    WHERE id = batch_outbox.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para insertar automáticamente en outbox cuando hay cambios en tablas auditadas
-- Este trigger se aplica a las tablas críticas del sistema contable

-- Trigger para la tabla Transaction
CREATE OR REPLACE FUNCTION trigger_transaction_audit()
RETURNS trigger AS $$
BEGIN
  -- Insertar en outbox en lugar de auditlog directo
  INSERT INTO outbox_audit (tablename, recordid, action, oldvalues, newvalues, changedfields, userid, useragent, ipaddress, tenantid)
  VALUES (
    'Transaction',
    NEW.id::text,
    TG_OP::text,
    CASE WHEN TG_OP = 'DELETE' THEN OLD::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'CREATE') THEN NEW::jsonb ELSE NULL END,
    NULL, -- changedfields se calculará en el procesador si es necesario
    current_setting('request.jwt.claims', true)::json->>'sub'::text,
    current_setting('request.user-agent', true),
    current_setting('request.remote_addr', true),
    current_setting('request.jwt.claims', true)::json->>'tenant_id'::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Transaction"
FOR EACH ROW EXECUTE FUNCTION trigger_transaction_audit();

-- Trigger para la tabla JournalEntry
CREATE OR REPLACE FUNCTION trigger_journalentry_audit()
RETURNS trigger AS $$
BEGIN
  INSERT INTO outbox_audit (tablename, recordid, action, oldvalues, newvalues, changedfields, userid, useragent, ipaddress, tenantid)
  VALUES (
    'JournalEntry',
    NEW.id::text,
    TG_OP::text,
    CASE WHEN TG_OP = 'DELETE' THEN OLD::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'CREATE') THEN NEW::jsonb ELSE NULL END,
    NULL,
    current_setting('request.jwt.claims', true)::json->>'sub'::text,
    current_setting('request.user-agent', true),
    current_setting('request.remote_addr', true),
    current_setting('request.jwt.claims', true)::json->>'tenant_id'::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journalentry_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION trigger_journalentry_audit();

-- Trigger para la tabla Account
CREATE OR REPLACE FUNCTION trigger_account_audit()
RETURNS trigger AS $$
BEGIN
  INSERT INTO outbox_audit (tablename, recordid, action, oldvalues, newvalues, changedfields, userid, useragent, ipaddress, tenantid)
  VALUES (
    'Account',
    NEW.id::text,
    TG_OP::text,
    CASE WHEN TG_OP = 'DELETE' THEN OLD::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'CREATE') THEN NEW::jsonb ELSE NULL END,
    NULL,
    current_setting('request.jwt.claims', true)::json->>'sub'::text,
    current_setting('request.user-agent', true),
    current_setting('request.remote_addr', true),
    current_setting('request.jwt.claims', true)::json->>'tenant_id'::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Account"
FOR EACH ROW EXECUTE FUNCTION trigger_account_audit();

-- 4. Programa programado (cron job) para procesar la outbox
-- Ejecutar cada minuto o según sea necesario
-- SELECT process_outbox_audit();

-- 5. Verificar y limpiar outbox antiguo (opcional)
-- DELETE FROM outbox_audit WHERE processed = TRUE AND "timestamp" < now() - interval '30 days';

-- Nota: Los triggers insertan en outbox usando el contexto de la petición actual.
-- Si se llama desde Prisma middleware sin contexto de request, el userid puede ser 'system'.
-- En ese caso, se recomienda pasar el userId explícitamente desde la aplicación.