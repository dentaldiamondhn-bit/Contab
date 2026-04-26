-- ========================================
-- REVISIÓN Y CORRECCIÓN DE SCHEMA SQL
-- Tablas: Tenants, Plans, Users, Invoices
-- ========================================

-- ========================================
-- VERIFICACIÓN Y CORRECCIÓN DE ESTRUCTURA EXISTENTE
-- ========================================

-- Verificar si las tablas existen y su estructura
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('tenants', 'users', 'Plan', 'Invoice', 'InvoiceItem')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Si las tablas ya existen con estructura incorrecta, realizar correcciones
-- (Descomentar las líneas necesarias)

-- Corregir tabla tenants si es necesario
-- ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'BASIC';
-- ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monthly_cost INTEGER DEFAULT 1000;
-- ALTER TABLE tenants RENAME COLUMN subscription_plans TO subscription_plan;

-- Corregir tabla Invoice si es necesario
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS tenant_id TEXT;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS due_date TIMESTAMP NOT NULL;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS period_start TIMESTAMP NOT NULL;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS period_end TIMESTAMP NOT NULL;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS subtotal INTEGER DEFAULT 0;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS tax INTEGER DEFAULT 0;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS total INTEGER DEFAULT 0;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'HNL';
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS plans_data TEXT;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ========================================
-- TABLA TENANTS (CORREGIDA)
-- ========================================
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    business_rtn TEXT UNIQUE NOT NULL,
    business_email TEXT UNIQUE NOT NULL,
    business_address TEXT NOT NULL,
    tenant_code TEXT UNIQUE NOT NULL,
    country TEXT DEFAULT 'HN',
    phone_number TEXT,
    logo_url TEXT,
    timezone TEXT DEFAULT 'America/Tegucigalpa',
    currency TEXT DEFAULT 'HNL',
    
    -- CAMPO CORREGIDO: subscription_plan (singular) no subscription_plans
    subscription_plan TEXT DEFAULT 'BASIC',  -- JSON array de plan codes con cantidades
    
    max_users INTEGER DEFAULT 5,
    max_storage INTEGER DEFAULT 100,
    max_transactions INTEGER DEFAULT 10000,
    monthly_cost INTEGER DEFAULT 1000,
    modules TEXT,  -- Comma-separated list of available modules
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABLA PLANS
-- ========================================
CREATE TABLE IF NOT EXISTS "Plan" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    price INTEGER NOT NULL,
    max_users INTEGER NOT NULL,
    max_storage INTEGER NOT NULL,
    max_transactions INTEGER NOT NULL,
    features TEXT NOT NULL,  -- JSON array as string
    modules TEXT NOT NULL,   -- JSON array of module ids
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABLA USERS
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    auth_id TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    password TEXT,
    tenant_id TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

-- ========================================
-- TABLA INVOICES
-- ========================================
CREATE TABLE IF NOT EXISTS "Invoice" (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    subtotal INTEGER DEFAULT 0,
    tax INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'HNL',
    status TEXT DEFAULT 'PENDING',  -- PENDING, PAID, OVERDUE, CANCELLED
    plans_data TEXT,  -- JSON with plan details and quantities
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ========================================
-- TABLA INVOICE_ITEMS
-- ========================================
CREATE TABLE IF NOT EXISTS "InvoiceItem" (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (invoice_id) REFERENCES "Invoice"(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES "Plan"(id) ON DELETE SET NULL
);

-- ========================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ========================================

-- Tenants
CREATE INDEX IF NOT EXISTS idx_tenants_business_rtn ON tenants(business_rtn);
CREATE INDEX IF NOT EXISTS idx_tenants_business_email ON tenants(business_email);
CREATE INDEX IF NOT EXISTS idx_tenants_tenant_code ON tenants(tenant_code);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Plans
CREATE INDEX IF NOT EXISTS idx_plans_code ON "Plan"(code);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON "Plan"(is_active);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON "Invoice"(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON "Invoice"(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON "Invoice"(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON "Invoice"(invoice_number);

-- InvoiceItems
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON "InvoiceItem"(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_plan_id ON "InvoiceItem"(plan_id);

-- ========================================
-- CORRECCIONES PARA DATOS EXISTENTES
-- ========================================

-- Si existe la columna incorrecta, renombrarla
-- (Descomentar si es necesario)
-- ALTER TABLE tenants RENAME COLUMN subscription_plans TO subscription_plan;

-- Asegurar que monthly_cost exista
-- (Descomentar si es necesario)
-- ALTER TABLE tenants ADD COLUMN monthly_cost INTEGER DEFAULT 1000;

-- ========================================
-- DATOS DE EJEMPLO PARA PLANES
-- ========================================
INSERT INTO "Plan" (id, name, code, price, max_users, max_storage, max_transactions, features, modules, is_active) 
VALUES 
('plan_basic_001', 'Plan Básico', 'BASIC', 1000, 5, 100, 10000, '["Contabilidad básica", "Reportes simples"]', '["accounting", "reports"]', true),
('plan_pro_001', 'Plan Profesional', 'PRO', 2500, 20, 500, 50000, '["Contabilidad avanzada", "Reportes detallados", "Multi-usuario", "API access"]', '["accounting", "reports", "api", "multi-user"]', true),
('plan_enterprise_001', 'Plan Enterprise', 'ENTERPRISE', 5000, 50, 2000, 200000, '["Todas las características", "Soporte prioritario", "Personalización", "API completa", "Integraciones"]', '["accounting", "reports", "api", "multi-user", "integrations", "support"]', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- EJEMPLOS DE SUSCRIPCIONES EN FORMATO JSON
-- ========================================

-- Ejemplo de subscription_plan JSON para tenant con un plan
-- '[{"code": "BASIC", "quantity": 1}]'

-- Ejemplo de subscription_plan JSON para tenant con múltiples planes
-- '[{"code": "BASIC", "quantity": 2}, {"code": "PRO", "quantity": 1}]'

-- Ejemplo de modules CSV
-- 'accounting,reports,billing'

-- ========================================
-- TRIGGERS PARA updated_at (POSTGRESQL)
-- ========================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para tenants
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para "Plan"
CREATE TRIGGER update_plan_updated_at
    BEFORE UPDATE ON "Plan"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para "Invoice"
CREATE TRIGGER update_invoice_updated_at
    BEFORE UPDATE ON "Invoice"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VISTAS ÚTILES (OPCIONAL)
-- ========================================

-- Vista de tenants con información de planes
CREATE OR REPLACE VIEW tenant_summary AS
SELECT 
    t.id,
    t.business_name,
    t.tenant_code,
    t.business_email,
    t.subscription_plan,
    t.monthly_cost,
    t.max_users,
    t.is_active,
    t.created_at,
    (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.is_active = true) as active_users,
    (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as total_users
FROM tenants t;

-- Vista de facturas pendientes
CREATE OR REPLACE VIEW pending_invoices AS
SELECT 
    i.id,
    i.invoice_number,
    i.tenant_id,
    t.business_name,
    i.total,
    i.due_date,
    i.issue_date,
    i.status
FROM "Invoice" i
JOIN tenants t ON i.tenant_id = t.id
WHERE i.status = 'PENDING'
ORDER BY i.due_date ASC;
