-- =====================================================
-- SCRIPT COMPLETO DE ROW LEVEL SECURITY (RLS) PARA SUPABASE
-- Versión corregida con nombres de columnas reales
-- =====================================================

-- 1. Crear función para obtener tenant_id del contexto
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS text AS $$
BEGIN
  -- Obtener del auth context o metadata
  RETURN current_setting('app.current_tenant_id', true);
EXCEPTION WHEN OTHERS THEN
  -- Si no hay tenant_id en el contexto, intentar obtener del usuario autenticado
  BEGIN
    RETURN (
      SELECT raw_user_meta_data->>'tenantId' 
      FROM auth.users 
      WHERE auth.users.id = auth.uid()
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para verificar si es super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND raw_user_meta_data->>'role' IN ('SUPER_ADMIN', 'SUPPORT')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS PARA TABLA TENANT
-- =====================================================

-- Solo super admins pueden ver todos los tenants
CREATE POLICY "super_admin_view_all_tenants" ON "Tenant"
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Admins de tenant solo pueden ver su tenant
CREATE POLICY "tenant_admin_view_own" ON "Tenant"
  FOR SELECT
  TO authenticated
  USING (id = get_current_tenant_id());

-- Solo super admins pueden crear tenants
CREATE POLICY "super_admin_create_tenants" ON "Tenant"
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Solo super admins pueden actualizar tenants
CREATE POLICY "super_admin_update_tenants" ON "Tenant"
  FOR UPDATE
  TO authenticated
  USING (is_super_admin());

-- Solo super admins pueden eliminar tenants
CREATE POLICY "super_admin_delete_tenants" ON "Tenant"
  FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- =====================================================
-- POLÍTICAS PARA TABLA USER (usa tenantid en minúsculas)
-- =====================================================

-- Solo usuarios del mismo tenant pueden ver usuarios
CREATE POLICY "tenant_isolation_users_select" ON "User"
  FOR SELECT
  TO authenticated
  USING (tenantid = get_current_tenant_id() OR is_super_admin());

-- Solo usuarios del mismo tenant pueden insertar usuarios
CREATE POLICY "tenant_isolation_users_insert" ON "User"
  FOR INSERT
  TO authenticated
  WITH CHECK (tenantid = get_current_tenant_id() OR is_super_admin());

-- Solo usuarios del mismo tenant pueden actualizar usuarios
CREATE POLICY "tenant_isolation_users_update" ON "User"
  FOR UPDATE
  TO authenticated
  USING (tenantid = get_current_tenant_id() OR is_super_admin());

-- Solo usuarios del mismo tenant pueden eliminar usuarios
CREATE POLICY "tenant_isolation_users_delete" ON "User"
  FOR DELETE
  TO authenticated
  USING (tenantid = get_current_tenant_id() OR is_super_admin());

-- =====================================================
-- POLÍTICAS PARA TABLA ACCOUNT (usa tenant_id)
-- =====================================================

CREATE POLICY "tenant_isolation_accounts" ON "Account"
  FOR ALL
  TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_super_admin());

-- =====================================================
-- VERIFICACIÓN DE POLÍTICAS CREADAS
-- =====================================================

-- Verificar todas las políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- ÍNDICES RECOMENDADOS PARA RLS
-- =====================================================

-- Crear índices en columnas tenant_id para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_user_tenantid ON "User"(tenantid);
CREATE INDEX IF NOT EXISTS idx_account_tenant_id ON "Account"(tenant_id);

-- =====================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION get_current_tenant_id() IS 'Obtiene el tenant_id del contexto de la aplicación o del metadata del usuario autenticado';
COMMENT ON FUNCTION is_super_admin() IS 'Verifica si el usuario autenticado tiene rol SUPER_ADMIN o SUPPORT';
COMMENT ON POLICY "super_admin_view_all_tenants" ON "Tenant" IS 'Permite a super administradores ver todos los tenants';
COMMENT ON POLICY "tenant_admin_view_own" ON "Tenant" IS 'Permite a administradores de tenant ver solo su propio tenant';
COMMENT ON POLICY "tenant_isolation_users_select" ON "User" IS 'Aísla usuarios por tenant con excepción para super admins';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
