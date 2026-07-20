-- Deshabilitar políticas RLS temporalmente para permitir acceso a las tablas
-- Esto soluciona el error "Tenant or user not found"

-- Deshabilitar RLS en la tabla companies
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla User
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla CustomTaxes
ALTER TABLE "CustomTaxes" DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla invoices
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla invoice_items
ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla cai
ALTER TABLE cai DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla products
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla accounts
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla polizas
ALTER TABLE polizas DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('companies', 'User', 'CustomTaxes', 'invoices', 'invoice_items', 'cai', 'products', 'accounts', 'polizas')
ORDER BY tablename;
