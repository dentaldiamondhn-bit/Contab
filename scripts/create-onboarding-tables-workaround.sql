-- Crear tablas necesarias para el onboarding (WORKAROUND)
-- Ejecutar en Supabase SQL Editor

-- 0. Crear función auxiliar para obtener tenant_id del usuario
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT tenantid 
    FROM "User" 
    WHERE authid = auth.uid()::TEXT
    LIMIT 1
  );
END;
$$;

-- 1. Crear tabla companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES Tenant(id),
  name TEXT NOT NULL,
  business_type TEXT,
  rtn TEXT,
  address TEXT,
  contact_phone TEXT,
  client_phone TEXT,
  company_phone TEXT,
  email TEXT,
  industry TEXT,
  country TEXT DEFAULT 'Honduras',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Crear tabla onboarding_companies
CREATE TABLE IF NOT EXISTS onboarding_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  rtn TEXT,
  address TEXT,
  contact_phone TEXT,
  client_phone TEXT,
  company_phone TEXT,
  country TEXT,
  email TEXT,
  industry TEXT,
  business_type TEXT,
  logo_url TEXT,
  setup_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla tenant_plans
CREATE TABLE IF NOT EXISTS tenant_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES Tenant(id),
  plan_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  max_users INTEGER NOT NULL,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_plans ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas de RLS básicas (USANDO FUNCIÓN)
-- NOTA: Usar función auxiliar get_user_tenant_id() para evitar problemas de casting
-- Política para companies (solo el tenant dueño puede ver/modificar sus companies)
CREATE POLICY "Tenants can view own companies" ON companies
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenants can insert own companies" ON companies
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenants can update own companies" ON companies
  FOR UPDATE USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenants can delete own companies" ON companies
  FOR DELETE USING (tenant_id = get_user_tenant_id());

-- Política para onboarding_companies (solo el usuario dueño puede ver/modificar sus registros)
CREATE POLICY "Users can view own onboarding" ON onboarding_companies
  FOR SELECT USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can insert own onboarding" ON onboarding_companies
  FOR INSERT WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can update own onboarding" ON onboarding_companies
  FOR UPDATE USING (user_id = auth.uid()::TEXT)
  WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete own onboarding" ON onboarding_companies
  FOR DELETE USING (user_id = auth.uid()::TEXT);

-- Política para tenant_plans (solo el tenant dueño puede ver/modificar sus planes)
CREATE POLICY "Tenants can view own plans" ON tenant_plans
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenants can insert own plans" ON tenant_plans
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenants can update own plans" ON tenant_plans
  FOR UPDATE USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenants can delete own plans" ON tenant_plans
  FOR DELETE USING (tenant_id = get_user_tenant_id());

-- 6. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_onboarding_companies_user_id ON onboarding_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_companies_email ON onboarding_companies(email);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_tenant_id ON tenant_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_plan_id ON tenant_plans(plan_id);

-- 7. Verificar esquema
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('companies', 'onboarding_companies', 'tenant_plans')
ORDER BY table_name, ordinal_position;

-- 8. Probar función
SELECT get_user_tenant_id();
