-- ========================================
-- CORRECCIÓN ESPECÍFICA PARA BASE DE DATOS EXISTENTE
-- ========================================

-- Paso 1: Verificar qué son tablas y cuáles son vistas
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('Tenant', 'Invoice', 'InvoiceItem', 'users', 'tenant_plan_statistics')
ORDER BY table_name;

-- Paso 2: Verificar si tenant_plan_statistics es una vista
SELECT 
    view_definition
FROM information_schema.views 
WHERE table_name = 'tenant_plan_statistics' 
AND table_schema = 'public';

-- Paso 3: Si es una vista, eliminarla y crear como tabla
DROP VIEW IF EXISTS tenant_plan_statistics;

-- Crear tabla tenant_plan_statistics como tabla real
CREATE TABLE tenant_plan_statistics (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    subscriptionplan TEXT DEFAULT 'BASIC',
    plan_code TEXT,
    quantity INTEGER DEFAULT 1,
    usercount INTEGER DEFAULT 0,
    monthly_cost INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Paso 4: Agregar columnas faltantes a la tabla Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'BASIC';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS monthly_cost INTEGER DEFAULT 1000;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS modules TEXT;

-- Paso 5: Corregir tabla Invoice - agregar columnas faltantes
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS period_start TIMESTAMP DEFAULT DATE_TRUNC('month', CURRENT_TIMESTAMP);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS period_end TIMESTAMP DEFAULT (DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month' - INTERVAL '1 day');
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS plans_data TEXT;

-- Paso 6: Poblar tenant_plan_statistics con datos existentes
INSERT INTO tenant_plan_statistics (id, tenant_id, subscriptionplan, plan_code, quantity, usercount, monthly_cost)
SELECT 
    gen_random_uuid()::text as id,
    t.id as tenant_id,
    COALESCE(t.subscription_plan, 'BASIC') as subscriptionplan,
    CASE 
        WHEN COALESCE(t.subscription_plan, 'BASIC') LIKE '%BASIC%' THEN 'BASIC'
        WHEN COALESCE(t.subscription_plan, 'BASIC') LIKE '%PRO%' THEN 'PRO'
        WHEN COALESCE(t.subscription_plan, 'BASIC') LIKE '%ENTERPRISE%' THEN 'ENTERPRISE'
        ELSE 'BASIC'
    END as plan_code,
    1 as quantity,
    (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.is_active = true) as usercount,
    COALESCE(t.monthly_cost, 1000) as monthly_cost
FROM "Tenant" t
WHERE t.is_active = true;

-- Paso 7: Crear vista para mapear nombres de columnas en Invoice
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

-- Paso 8: Crear vista para InvoiceItem con nombres correctos
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

-- Paso 9: Verificar estructura después de correcciones
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

-- Paso 10: Contar registros después de correcciones
SELECT 'Tenant' as table_name, COUNT(*) as record_count FROM "Tenant"
UNION ALL
SELECT 'User' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Invoice' as table_name, COUNT(*) as record_count FROM "Invoice"
UNION ALL
SELECT 'InvoiceItem' as table_name, COUNT(*) as record_count FROM "InvoiceItem"
UNION ALL
SELECT 'tenant_plan_statistics' as table_name, COUNT(*) as record_count FROM tenant_plan_statistics;

-- Paso 11: Verificar si hay tabla Plan (buscar variantes)
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

-- Paso 12: Crear vista combinada de estadísticas de planes
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
    tps.plan_code,
    tps.usercount as active_users,
    (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as total_users,
    CASE 
        WHEN tps.usercount >= t.max_users THEN 'LIMIT_EXCEEDED'
        WHEN tps.usercount >= t.max_users * 0.8 THEN 'NEAR_LIMIT'
        ELSE 'OK'
    END as usage_status,
    tps.monthly_cost as plan_cost,
    tps.created_at as statistics_created,
    tps.updated_at as statistics_updated
FROM "Tenant" t
LEFT JOIN tenant_plan_statistics tps ON t.id = tps.tenant_id;

-- Paso 13: Crear función para actualizar estadísticas automáticamente
CREATE OR REPLACE FUNCTION update_tenant_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar o insertar estadísticas para el tenant modificado
    INSERT INTO tenant_plan_statistics (id, tenant_id, subscriptionplan, plan_code, quantity, usercount, monthly_cost, updated_at)
    VALUES (
        gen_random_uuid()::text,
        NEW.id,
        COALESCE(NEW.subscription_plan, 'BASIC'),
        CASE 
            WHEN COALESCE(NEW.subscription_plan, 'BASIC') LIKE '%BASIC%' THEN 'BASIC'
            WHEN COALESCE(NEW.subscription_plan, 'BASIC') LIKE '%PRO%' THEN 'PRO'
            WHEN COALESCE(NEW.subscription_plan, 'BASIC') LIKE '%ENTERPRISE%' THEN 'ENTERPRISE'
            ELSE 'BASIC'
        END,
        1,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = NEW.id AND u.is_active = true),
        COALESCE(NEW.monthly_cost, 1000),
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (tenant_id) 
    DO UPDATE SET 
        subscriptionplan = EXCLUDED.subscriptionplan,
        plan_code = EXCLUDED.plan_code,
        usercount = EXCLUDED.usercount,
        monthly_cost = EXCLUDED.monthly_cost,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Paso 14: Crear trigger para actualizar estadísticas automáticamente
DROP TRIGGER IF EXISTS trigger_update_tenant_statistics ON "Tenant";
CREATE TRIGGER trigger_update_tenant_statistics
    AFTER INSERT OR UPDATE ON "Tenant"
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_statistics();

-- Paso 15: Crear función para actualizar estadísticas cuando cambia un usuario
CREATE OR REPLACE FUNCTION update_tenant_statistics_on_user_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar estadísticas del tenant del usuario modificado
    UPDATE tenant_plan_statistics 
    SET 
        usercount = (SELECT COUNT(*) FROM users u WHERE u.tenant_id = NEW.tenant_id AND u.is_active = true),
        updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = NEW.tenant_id;
    
    -- Si no existe registro, crearlo
    INSERT INTO tenant_plan_statistics (id, tenant_id, subscriptionplan, plan_code, quantity, usercount, monthly_cost)
    SELECT 
        gen_random_uuid()::text,
        NEW.tenant_id,
        COALESCE(t.subscription_plan, 'BASIC'),
        CASE 
            WHEN COALESCE(t.subscription_plan, 'BASIC') LIKE '%BASIC%' THEN 'BASIC'
            WHEN COALESCE(t.subscription_plan, 'BASIC') LIKE '%PRO%' THEN 'PRO'
            WHEN COALESCE(t.subscription_plan, 'BASIC') LIKE '%ENTERPRISE%' THEN 'ENTERPRISE'
            ELSE 'BASIC'
        END,
        1,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = NEW.tenant_id AND u.is_active = true),
        COALESCE(t.monthly_cost, 1000)
    FROM "Tenant" t
    WHERE t.id = NEW.tenant_id
    AND NOT EXISTS (SELECT 1 FROM tenant_plan_statistics WHERE tenant_id = NEW.tenant_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Paso 16: Crear trigger para actualizar estadísticas cuando cambia un usuario
DROP TRIGGER IF EXISTS trigger_update_tenant_statistics_on_user ON users;
CREATE TRIGGER trigger_update_tenant_statistics_on_user
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_statistics_on_user_change();
