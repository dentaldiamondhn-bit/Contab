-- Crear tablas necesarias para el onboarding
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tabla companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES Tenant(id),
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
  setup_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Crear tabla tenant_plans
CREATE TABLE IF NOT EXISTS tenant_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES Tenant(id),
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
  start_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_plans ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas de RLS básicas
-- NOTA: auth.uid() devuelve el UUID del usuario autenticado
-- Política para companies (solo el tenant dueño puede ver/modificar sus companies)
CREATE POLICY "Tenants can view own companies" ON companies
  FOR ALL USING (tenant_id = auth.uid())
  WITH CHECK (true);

CREATE POLICY "Tenants can insert own companies" ON companies
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenants can update own companies" ON companies
  FOR UPDATE USING (tenant_id = auth.uid())
  WITH CHECK (true);

CREATE POLICY "Tenants can delete own companies" ON companies
  FOR DELETE USING (tenant_id = auth.uid())
  WITH CHECK (true);

-- Política para onboarding_companies (solo el usuario dueño puede ver/modificar sus registros)
CREATE POLICY "Users can view own onboarding" ON onboarding_companies
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (true);

CREATE POLICY "Users can insert own onboarding" ON onboarding_companies
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding" ON onboarding_companies
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (true);

CREATE POLICY "Users can delete own onboarding" ON onboarding_companies
  FOR DELETE USING (user_id = auth.uid())
  WITH CHECK (true);

-- Política para tenant_plans (solo el tenant dueño puede ver/modificar sus planes)
CREATE POLICY "Tenants can view own plans" ON tenant_plans
  FOR ALL USING (tenant_id = auth.uid())
  WITH CHECK (true);

CREATE POLICY "Tenants can insert own plans" ON tenant_plans
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenants can update own plans" ON tenant_plans
  FOR UPDATE USING (tenant_id = auth.uid())
  WITH CHECK (true);

CREATE POLICY "Tenants can delete own plans" ON tenant_plans
  FOR DELETE USING (tenant_id = auth.uid())
  WITH CHECK (true);

-- 6. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_onboarding_companies_user_id ON onboarding_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_companies_email ON onboarding_companies(email);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_tenant_id ON tenant_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_plan_id ON tenant_plans(plan_id);

-- 7. Insertar datos de ejemplo (opcional)
-- NOTA: auth.uid() devuelve el UUID del usuario autenticado
-- INSERT INTO companies (tenant_id, name, business_type, rtn, address, email, industry, country, created_at, updated_at)
-- VALUES ('demo-tenant-uuid', 'Empresa Demo', 'SERVICES', '0801199912345', 'Dirección Demo', 'demo@contab.com', 'Servicios', 'Honduras', NOW(), NOW());

-- INSERT INTO onboarding_companies (user_id, company_name, rtn, address, email, industry, business_type, setup_completed, created_at, updated_at)
-- VALUES ('demo-user-id', 'Empresa Demo', '0801199912345', 'Dirección Demo', 'demo@contab.com', 'Servicios', 'SERVICES', true, NOW(), NOW());

-- INSERT INTO tenant_plans (tenant_id, plan_id, plan_code, plan_name, unit_price, subtotal, tax_rate, tax_amount, total, max_users, features, is_active, start_date, created_at, updated_at)
-- VALUES ('demo-tenant-uuid', 'plan-basic', 'BASICO', 'Plan Básico', 500.00, 500.00, 0.15, 75.00, 575.00, 5, '["Contabilidad básica", "Facturación electrónica", "Reportes básicos"]', true, NOW(), NOW(), NOW());
