-- ========================================
-- CORRECCIÓN ESPECÍFICA PARA BASE DE DATOS EXISTENTE
-- ========================================

-- Paso 1: Verificar tabla Tenant (con T mayúscula)
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'Tenant' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Paso 2: Agregar columnas faltantes a la tabla Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'BASIC';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS monthly_cost INTEGER DEFAULT 1000;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS modules TEXT;

-- Paso 3: Corregir tabla Invoice - agregar columnas faltantes
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS period_start TIMESTAMP DEFAULT DATE_TRUNC('month', CURRENT_TIMESTAMP);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS period_end TIMESTAMP DEFAULT (DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month' - INTERVAL '1 day');
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS plans_data TEXT;

-- Paso 4: Verificar y actualizar tabla tenant_plan_statistics
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tenant_plan_statistics' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Agregar columnas faltantes a tenant_plan_statistics si es necesario
ALTER TABLE tenant_plan_statistics ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE tenant_plan_statistics ADD COLUMN IF NOT EXISTS plan_code TEXT;
ALTER TABLE tenant_plan_statistics ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE tenant_plan_statistics ADD COLUMN IF NOT EXISTS monthly_cost INTEGER DEFAULT 0;
ALTER TABLE tenant_plan_statistics ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tenant_plan_statistics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Si la tabla está vacía, podemos poblarla con datos de ejemplo
INSERT INTO tenant_plan_statistics (subscriptionplan, usercount, tenant_id, plan_code, quantity, monthly_cost)
SELECT 
    t.subscription_plan,
    (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.is_active = true) as usercount,
    t.id as tenant_id,
    CASE 
        WHEN t.subscription_plan LIKE '%BASIC%' THEN 'BASIC'
        WHEN t.subscription_plan LIKE '%PRO%' THEN 'PRO'
        WHEN t.subscription_plan LIKE '%ENTERPRISE%' THEN 'ENTERPRISE'
        ELSE 'BASIC'
    END as plan_code,
    1 as quantity,
    COALESCE(t.monthly_cost, 1000) as monthly_cost
FROM "Tenant" t
WHERE NOT EXISTS (SELECT 1 FROM tenant_plan_statistics LIMIT 1);

-- Paso 5: Crear vista para mapear nombres de columnas
CREATE OR REPLACE VIEW invoice_view AS
SELECT 
    id,
    tenantid as tenant_id,
    customerid,
    invoicenumber as invoice_number,
    date,
    duedate as due_date,
    subtotal,
    taxamount as tax,
    totalamount as total,
    status,
    currency,
    exchangerate,
    notes,
    createdat as created_at,
    updatedat as updated_at,
    issue_date,
    period_start,
    period_end,
    plans_data
FROM "Invoice";

-- Paso 6: Crear vista para InvoiceItem con nombres correctos
CREATE OR REPLACE VIEW invoice_item_view AS
SELECT 
    id,
    invoiceid as invoice_id,
    accountid,
    description as plan_name,
    quantity,
    unitprice as unit_price,
    taxrate,
    taxamount,
    totalamount as subtotal,
    createdat as created_at
FROM "InvoiceItem";

-- Paso 7: Verificar estructura después de correcciones
SELECT 
    'Tenant' as table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Tenant' 
AND table_schema = 'public'
AND column_name IN ('subscription_plan', 'monthly_cost', 'max_users', 'modules')
UNION ALL
SELECT 
    'Invoice' as table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Invoice' 
AND table_schema = 'public'
AND column_name IN ('issue_date', 'period_start', 'period_end', 'plans_data')
UNION ALL
SELECT 
    'tenant_plan_statistics' as table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tenant_plan_statistics' 
AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Paso 8: Contar registros después de correcciones
SELECT 'Tenant' as table_name, COUNT(*) as record_count FROM "Tenant"
UNION ALL
SELECT 'User' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Invoice' as table_name, COUNT(*) as record_count FROM "Invoice"
UNION ALL
SELECT 'InvoiceItem' as table_name, COUNT(*) as record_count FROM "InvoiceItem"
UNION ALL
SELECT 'tenant_plan_statistics' as table_name, COUNT(*) as record_count FROM tenant_plan_statistics;

-- Paso 9: Verificar si hay tabla Plan (buscar variantes)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name ILIKE '%plan%' OR table_name ILIKE '%Plan%')
ORDER BY table_name;

-- Si no existe tabla Plan, crearla
CREATE TABLE IF NOT EXISTS "Plan" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    price INTEGER NOT NULL,
    max_users INTEGER NOT NULL,
    max_storage INTEGER NOT NULL,
    max_transactions INTEGER NOT NULL,
    features TEXT NOT NULL,
    modules TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar planes básicos si no existen
INSERT INTO "Plan" (id, name, code, price, max_users, max_storage, max_transactions, features, modules, is_active) 
VALUES 
('plan_basic_001', 'Plan Básico', 'BASIC', 1000, 5, 100, 10000, '["Contabilidad básica", "Reportes simples"]', '["accounting", "reports"]', true),
('plan_pro_001', 'Plan Profesional', 'PRO', 2500, 20, 500, 50000, '["Contabilidad avanzada", "Reportes detallados", "Multi-usuario", "API access"]', '["accounting", "reports", "api", "multi-user"]', true),
('plan_enterprise_001', 'Plan Enterprise', 'ENTERPRISE', 5000, 50, 2000, 200000, '["Todas las características", "Soporte prioritario", "Personalización", "API completa", "Integraciones"]', '["accounting", "reports", "api", "multi-user", "integrations", "support"]', true)
ON CONFLICT (id) DO NOTHING;

-- Paso 10: Crear vista combinada de estadísticas de planes
CREATE OR REPLACE VIEW tenant_plan_summary AS
SELECT 
    t.id as tenant_id,
    t.business_name,
    t.tenant_code,
    t.subscription_plan,
    t.monthly_cost,
    t.max_users,
    t.is_active,
    tps.subscriptionplan as current_plan,
    tps.usercount as active_users,
    (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as total_users,
    CASE 
        WHEN tps.usercount >= t.max_users THEN 'LIMIT_EXCEEDED'
        WHEN tps.usercount >= t.max_users * 0.8 THEN 'NEAR_LIMIT'
        ELSE 'OK'
    END as usage_status
FROM "Tenant" t
LEFT JOIN tenant_plan_statistics tps ON t.id = tps.tenant_id;
