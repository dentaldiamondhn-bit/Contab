-- ============================================
-- FIX MINIMAL DE AUDITORÍA (sin DDL sobre tablas)
--
-- Este script SOLO reemplaza los cuerpos de las 3 funciones de auditoría.
-- `CREATE OR REPLACE FUNCTION` NO toma bloqueos sobre tablas, por lo que ES
-- IMPOSIBLE que se produzca un deadlock con las consultas concurrentes de la app.
--
-- Requisito: la tabla audit_outbox ya debe existir (se creó ejecutando
-- supabase/outbox-audit.sql en el pasado; ese archivo también crea índices,
-- RLS y policies).
--
-- Cambios que aplica:
--   1) to_jsonb(NEW)/to_jsonb(OLD) en lugar de NEW::jsonb (corrige
--      "cannot cast type Transaction to jsonb").
--   2) Guarda de excepción: si escribir en audit_outbox falla por cualquier
--      motivo, NO bloquea la operación contable principal.
--
-- EJECUTAR EN EL SQL EDITOR DE SUPABASE (Dashboard > SQL Editor).
-- Es idempotente y puede ejecutarse las veces que sea necesario.
-- ============================================

CREATE OR REPLACE FUNCTION trigger_transaction_audit()
RETURNS trigger AS $$
BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_journalentry_audit()
RETURNS trigger AS $$
BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_account_audit()
RETURNS trigger AS $$
BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Verificación (debe mostrar to_jsonb y EXCEPTION):
-- SELECT t.tgname AS trigger_name, c.relname AS table_name, pg_get_functiondef(t.tgfoid) AS function_def
-- FROM pg_trigger t
-- JOIN pg_class c ON c.oid = t.tgrelid
-- WHERE t.tgname LIKE '%_audit_trigger';