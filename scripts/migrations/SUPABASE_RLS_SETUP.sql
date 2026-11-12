-- ========================================
-- CONFIGURACIÓN RLS PARA MULTITENANT
-- ========================================

-- 1. Habilitar RLS en todas las tablas
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalEntry" ENABLE ROW LEVEL SECURITY;

-- 2. Crear función para establecer contexto de tenant
CREATE OR REPLACE FUNCTION set_tenant(tenant_id text)
RETURNS void AS $$
BEGIN
  -- Establecer el contexto del tenant para RLS
  PERFORM set_config('app.current_tenant_id', tenant_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear políticas RLS para Account
CREATE POLICY "Users can view their own tenant accounts" ON "Account"
FOR SELECT USING (tenantId = current_setting('app.current_tenant_id')::text);

CREATE POLICY "Users can insert their own tenant accounts" ON "Account"
FOR INSERT WITH CHECK (tenantId = current_setting('app.current_tenant_id')::text);

CREATE POLICY "Users can update their own tenant accounts" ON "Account"
FOR UPDATE USING (tenantId = current_setting('app.current_tenant_id')::text);

CREATE POLICY "Users can delete their own tenant accounts" ON "Account"
FOR DELETE USING (tenantId = current_setting('app.current_tenant_id')::text);

-- 4. Crear políticas RLS para Transaction
CREATE POLICY "Users can view their own tenant transactions" ON "Transaction"
FOR SELECT USING (tenantId = current_setting('app.current_tenant_id')::text);

CREATE POLICY "Users can insert their own tenant transactions" ON "Transaction"
FOR INSERT WITH CHECK (tenantId = current_setting('app.current_tenant_id')::text);

CREATE POLICY "Users can update their own tenant transactions" ON "Transaction"
FOR UPDATE USING (tenantId = current_setting('app.current_tenant_id')::text);

CREATE POLICY "Users can delete their own tenant transactions" ON "Transaction"
FOR DELETE USING (tenantId = current_setting('app.current_tenant_id')::text);

-- 5. Crear políticas RLS para JournalEntry
CREATE POLICY "Users can view their own tenant journal entries" ON "JournalEntry"
FOR SELECT USING (tenantId = current_setting('app.current_tenant_id')::text);

CREATE POLICY "Users can insert their own tenant journal entries" ON "JournalEntry"
FOR INSERT WITH CHECK (tenantId = current_setting('app.current_tenant_id')::text);

CREATE POLICY "Users can update their own tenant journal entries" ON "JournalEntry"
FOR UPDATE USING (tenantId = current_setting('app.current_tenant_id')::text);

CREATE POLICY "Users can delete their own tenant journal entries" ON "JournalEntry"
FOR DELETE USING (tenantId = current_setting('app.current_tenant_id')::text);

-- 6. Grant permisos para la función set_tenant
GRANT EXECUTE ON FUNCTION set_tenant(text) TO authenticated, anon, service_role;

-- 7. Opcional: Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_account_tenantid ON "Account"(tenantId);
CREATE INDEX IF NOT EXISTS idx_transaction_tenantid ON "Transaction"(tenantId);
CREATE INDEX IF NOT EXISTS idx_journalentry_tenantid ON "JournalEntry"(tenantId);

-- 8. Verificar estructura completa de las tablas
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('Account', 'Transaction', 'JournalEntry')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 9. Verificar nombres de columnas específicos de tenant
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('Account', 'Transaction', 'JournalEntry')
AND table_schema = 'public'
AND column_name ILIKE '%tenant%'
ORDER BY table_name, column_name;

-- 10. Verificar configuración
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN 'RLS Enabled'
    ELSE 'RLS Disabled'
  END as rls_status
FROM pg_tables 
WHERE tablename IN ('Account', 'Transaction', 'JournalEntry')
AND schemaname = 'public';

-- 9. Verificar políticas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('Account', 'Transaction', 'JournalEntry')
AND schemaname = 'public';

-- 10. Verificar función
SELECT 
  proname,
  prosrc,
  prosecdef,
  prolang
FROM pg_proc 
WHERE proname = 'set_tenant';
