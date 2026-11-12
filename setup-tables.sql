-- ============================================================
-- TABLAS CREA PARA CONTAB (desde schema Prisma)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Tabla users (del modelo User)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  auth_id VARCHAR(255) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  password VARCHAR(255),
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL
);

-- 2. Tabla tenants (del modelo Tenant)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  business_rtn VARCHAR(20) UNIQUE,
  business_email VARCHAR(255) UNIQUE,
  business_address TEXT,
  tenant_code VARCHAR(50) UNIQUE,
  country VARCHAR(2) DEFAULT 'HN',
  phone_number VARCHAR(20),
  logo_url TEXT,
  timezone VARCHAR(50) DEFAULT 'America/Tegucigalpa',
  currency VARCHAR(3) DEFAULT 'HNL',
  subscription_plans VARCHAR(50) DEFAULT 'BASIC',
  max_users INT DEFAULT 5,
  max_storage INT DEFAULT 100,
  max_transactions INT DEFAULT 10000,
  monthly_cost INT DEFAULT 1000,
  modules TEXT, -- Comma-separated list
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Tabla plans (del modelo Plan) - usar minúscula 'plans' para consistencia
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  price INT DEFAULT 0,
  max_users INT DEFAULT 10,
  max_storage INT DEFAULT 100,
  max_transactions INT DEFAULT 10000,
  features TEXT, -- JSON array as string
  modules TEXT, -- JSON array of module ids
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Tabla suppliers (del modelo Supplier)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rtn VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  commercial_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  mobile VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(2) DEFAULT 'HN',
  category VARCHAR(100),
  payment_terms TEXT,
  payment_method VARCHAR(100),
  bank_name VARCHAR(255),
  bank_account VARCHAR(100),
  account_type VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_preferred BOOLEAN DEFAULT false,
  tenant_id UUID,
  company_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_suppliers_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_suppliers_company FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE SET NULL
);

-- 5. Tabla company (relacionada con suppliers y tenants)
CREATE TABLE IF NOT EXISTS public.company (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rtn VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Tabla accounts (del modelo Account)
CREATE TABLE IF NOT EXISTS public.account (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  company_id UUID,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  type VARCHAR(100),
  description TEXT,
  parent_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_account_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_account_company FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE SET NULL,
  CONSTRAINT fk_account_parent FOREIGN KEY (parent_id) REFERENCES public.account(id) ON DELETE SET NULL
);

-- 7. Tabla exchange_rate_history (del modelo ExchangeRateHistory)
CREATE TABLE IF NOT EXISTS public.exchange_rate_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP NOT NULL,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate NUMERIC(19, 4) NOT NULL,
  source VARCHAR(50), -- e.g., "BCH", "Banco Central", "manual"
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Tabla journal_entry (del modelo JournalEntry)
CREATE TABLE IF NOT EXISTS public.journal_entry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID,
  account_id UUID,
  tenant_id UUID,
  company_id UUID,
  amount BIGINT NOT NULL,
  original_amount BIGINT,
  currency VARCHAR(3) DEFAULT 'HNL',
  exchange_rate NUMERIC(19, 4) DEFAULT 24.70,
  description TEXT,
  cleared BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_entry_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_entry_account FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE SET NULL,
  CONSTRAINT fk_entry_transaction FOREIGN KEY (transaction_id) REFERENCES public.transaction(id) ON DELETE SET NULL
);

-- 9. Tabla transaction (del modelo Transaction)
CREATE TABLE IF NOT EXISTS public.transaction (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  company_id UUID,
  date TIMESTAMP NOT NULL,
  description TEXT,
  reference VARCHAR(255),
  voucher_type VARCHAR(50),
  voucher_number INT DEFAULT 1,
  currency VARCHAR(3) DEFAULT 'HNL',
  exchange_rate NUMERIC(19, 4) DEFAULT 24.70,
  total_amount BIGINT,
  cliente_rtn VARCHAR(20),
  proveedor_rtn VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_transaction_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_transaction_company FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE SET NULL
);

-- 10. Tabla invoice (del modelo Invoice)
CREATE TABLE IF NOT EXISTS public.invoice (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  company_id UUID,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_type VARCHAR(50) DEFAULT 'CUSTOMER',
  status VARCHAR(50) DEFAULT 'ACTIVE',
  customer_name VARCHAR(255),
  customer_rtn VARCHAR(20),
  customer_email VARCHAR(255),
  customer_address TEXT,
  issuer_name VARCHAR(255),
  issuer_rtn VARCHAR(20),
  issuer_address TEXT,
  issue_date TIMESTAMP NOT NULL,
  due_date TIMESTAMP,
  cai VARCHAR(50),
  range_start BIGINT,
  range_end BIGINT,
  expiry_date TIMESTAMP,
  subtotal NUMERIC(19, 2) DEFAULT 0,
  tax NUMERIC(19, 2) DEFAULT 0,
  total NUMERIC(19, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'HNL',
  tax_rate NUMERIC(5, 2) DEFAULT 15,
  invoice_image TEXT,
  invoice_pdf TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_invoice_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_company FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE SET NULL
);

-- 11. Tabla invoice_item (del modelo InvoiceItem)
CREATE TABLE IF NOT EXISTS public.invoice_item (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID,
  company_id UUID,
  description TEXT NOT NULL,
  quantity NUMERIC(19, 2) DEFAULT 1,
  unit_price NUMERIC(19, 2) DEFAULT 0,
  total NUMERIC(19, 2) DEFAULT 0,
  tax_rate NUMERIC(5, 2) DEFAULT 15,
  tax_amount NUMERIC(19, 2) DEFAULT 0,
  is_taxable BOOLEAN DEFAULT true,
  product_code VARCHAR(100),
  service_code VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_invoiceitem_invoice FOREIGN KEY (invoice_id) REFERENCES public.invoice(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoiceitem_company FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE SET NULL
);

-- 12. Tabla supplier_price_history (del modelo SupplierPriceHistory)
CREATE TABLE IF NOT EXISTS public.supplier_price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  supplier_id UUID,
  product_id UUID,
  price NUMERIC(19, 4) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'HNL',
  effective_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_price_history_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_price_history_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE
);

-- Índices adicionales para rendimiento
CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_tenants_rtn ON public.tenants(business_rtn);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(business_email);
CREATE INDEX IF NOT EXISTS idx_plans_code ON public.plans(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_rtn ON public.suppliers(rtn);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_account_tenant ON public.account(tenant_id);
CREATE INDEX IF NOT EXISTS idx_account_company ON public.account(company_id);
CREATE INDEX IF NOT EXISTS idx_exchange_date ON public.exchange_rate_history(date);
CREATE INDEX IF NOT EXISTS idx_journal_entry_tenant ON public.journal_entry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tenant ON public.transaction(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tenant ON public.invoice(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_number ON public.invoice(invoice_number);
CREATE INDEX IF NOT EXISTS idx_supplier_price_tenant ON public.supplier_price_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_price_effective ON public.supplier_price_history(effective_date);

-- Habilitar RLS (Row Level Security) - importante para Supabase
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de RLS (todos pueden ver, solo admins pueden modificar)
CREATE POLICY "Allow read access for all" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow read access for all" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Allow read access for all" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Allow read access for all" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Allow read access for all" ON public.account FOR SELECT USING (true);
CREATE POLICY "Allow read access for all" ON public.transaction FOR SELECT USING (true);
CREATE POLICY "Allow read access for all" ON public.invoice FOR SELECT USING (true);

-- Insertar tenant por defecto (para development)
INSERT INTO public.tenants (business_name, business_rtn, business_email, business_address, tenant_code, country, phone_number, timezone, currency, subscription_plans, max_users, max_storage, max_transactions, monthly_cost)
VALUES ('Contab Default', '123456789', 'admin@contab.dev', 'Tegucigalpa, Honduras', 'CONTAB001', 'HN', '+504 9999-9999', 'America/Tegucigalpa', 'HNL', 'PREMIUM', 999, 999999, 99999999);

SELECT '✅ Tablas creadas exitosamente';
SELECT '✅ Tenant por defecto insertado';