-- Crear tablas necesarias para el onboarding (SIN RLS)
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tabla companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
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
  tenant_id TEXT NOT NULL,
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

-- 4. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_onboarding_companies_user_id ON onboarding_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_companies_email ON onboarding_companies(email);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_tenant_id ON tenant_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_plan_id ON tenant_plans(plan_id);

-- NOTA: Tablas creadas exitosamente. RLS puede configurarse después.
-- El onboarding funcionará sin seguridad a nivel de fila temporalmente.
