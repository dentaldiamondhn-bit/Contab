-- ========================================
-- CORRECCIÓN FINAL USANDO VISTAS EXISTENTES
-- ========================================

-- Paso 1: Verificar que las vistas clave existen
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('Tenants', 'invoice_view', 'invoice_item_view', 'tenant_plan_summary', 'Plan', 'tenant_plan_statistics', 'users')
ORDER BY table_name;

-- Paso 2: Verificar estructura de la vista Tenants
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Tenants'
ORDER BY ordinal_position;

-- Paso 3: Verificar estructura de la vista invoice_view
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'invoice_view'
ORDER BY ordinal_position;

-- Paso 4: Verificar estructura de la vista invoice_item_view
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'invoice_item_view'
ORDER BY ordinal_position;

-- Paso 5: Verificar estructura de la tabla users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Paso 6: Verificar estructura de la tabla Tenant (la tabla real)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Tenant'
ORDER BY ordinal_position;

-- Paso 7: Agregar columnas faltantes a la tabla Tenant si es necesario
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'BASIC';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS monthly_cost INTEGER DEFAULT 1000;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS modules TEXT;

-- Paso 8: Verificar si tenant_plan_statistics es tabla o vista
SELECT 
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'tenant_plan_statistics';

-- Paso 9: Si tenant_plan_statistics es vista, eliminarla y crear tabla
DROP VIEW IF EXISTS tenant_plan_statistics;
DROP TABLE IF EXISTS tenant_plan_statistics;

-- Crear tabla tenant_plan_statistics
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

-- Paso 10: Poblar tenant_plan_statistics con datos existentes
INSERT INTO tenant_plan_statistics (id, tenant_id, subscriptionplan, plan_code, quantity, usercount, monthly_cost)
SELECT 
    gen_random_uuid()::text as id,
    t.id as tenant_id,
    COALESCE(t.subscriptionplan, 'BASIC') as subscriptionplan,
    CASE 
        WHEN COALESCE(t.subscriptionplan, 'BASIC') LIKE '%BASIC%' THEN 'BASIC'
        WHEN COALESCE(t.subscriptionplan, 'BASIC') LIKE '%PRO%' THEN 'PRO'
        WHEN COALESCE(t.subscriptionplan, 'BASIC') LIKE '%ENTERPRISE%' THEN 'ENTERPRISE'
        ELSE 'BASIC'
    END as plan_code,
    1 as quantity,
    (SELECT COUNT(*) FROM users u WHERE u.tenant_id::text = t.id AND u.is_active = true) as usercount,
    COALESCE(t.monthlycost, 1000) as monthly_cost
FROM "Tenant" t
WHERE t.isactive = true;

-- Paso 11: Verificar y crear tabla Plan si no existe
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

-- Paso 12: Insertar planes básicos si no existen
INSERT INTO "Plan" (id, name, code, price, max_users, max_storage, max_transactions, features, modules, is_active) 
VALUES 
('plan_basic_001', 'Plan Básico', 'BASIC', 1000, 5, 100, 10000, '["Contabilidad básica", "Reportes simples"]', '["accounting", "reports"]', true),
('plan_pro_001', 'Plan Profesional', 'PRO', 2500, 20, 500, 50000, '["Contabilidad avanzada", "Reportes detallados", "Multi-usuario", "API access"]', '["accounting", "reports", "api", "multi-user"]', true),
('plan_enterprise_001', 'Plan Enterprise', 'ENTERPRISE', 5000, 50, 2000, 200000, '["Todas las características", "Soporte prioritario", "Personalización", "API completa", "Integraciones"]', '["accounting", "reports", "api", "multi-user", "integrations", "support"]', true)
ON CONFLICT (id) DO NOTHING;

-- Paso 13: Actualizar vista tenant_plan_summary si es necesario
DROP VIEW IF EXISTS tenant_plan_summary;
CREATE OR REPLACE VIEW tenant_plan_summary AS
SELECT 
    t.id AS tenant_id,
    t.businessname AS business_name,
    t.tenant_code,
    t.subscriptionplan AS subscription_plan,
    t.monthlycost AS monthly_cost,
    t.maxusers AS max_users,
    t.isactive AS is_active,
    tps.subscriptionplan AS current_plan,
    tps.plan_code,
    tps.usercount AS active_users,
    (SELECT COUNT(*) FROM users u WHERE u.tenant_id::text = t.id) AS total_users,
    CASE 
        WHEN tps.usercount >= t.maxusers THEN 'LIMIT_EXCEEDED'
        WHEN (tps.usercount)::numeric >= (t.maxusers)::numeric * 0.8 THEN 'NEAR_LIMIT'
        ELSE 'OK'
    END AS usage_status,
    tps.monthly_cost AS plan_cost,
    tps.created_at AS statistics_created,
    tps.updated_at AS statistics_updated
FROM "Tenant" t
LEFT JOIN tenant_plan_statistics tps ON t.id = tps.tenant_id;

-- Paso 14: Crear función para actualizar estadísticas automáticamente
CREATE OR REPLACE FUNCTION update_tenant_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar o insertar estadísticas para el tenant modificado
    INSERT INTO tenant_plan_statistics (id, tenant_id, subscriptionplan, plan_code, quantity, usercount, monthly_cost, updated_at)
    VALUES (
        gen_random_uuid()::text,
        NEW.id,
        COALESCE(NEW.subscriptionplan, 'BASIC'),
        CASE 
            WHEN COALESCE(NEW.subscriptionplan, 'BASIC') LIKE '%BASIC%' THEN 'BASIC'
            WHEN COALESCE(NEW.subscriptionplan, 'BASIC') LIKE '%PRO%' THEN 'PRO'
            WHEN COALESCE(NEW.subscriptionplan, 'BASIC') LIKE '%ENTERPRISE%' THEN 'ENTERPRISE'
            ELSE 'BASIC'
        END,
        1,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id::text = NEW.id AND u.is_active = true),
        COALESCE(NEW.monthlycost, 1000),
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

-- Paso 15: Crear trigger para actualizar estadísticas automáticamente
DROP TRIGGER IF EXISTS trigger_update_tenant_statistics ON "Tenant";
CREATE TRIGGER trigger_update_tenant_statistics
    AFTER INSERT OR UPDATE ON "Tenant"
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_statistics();

-- Paso 16: Crear función para actualizar estadísticas cuando cambia un usuario
CREATE OR REPLACE FUNCTION update_tenant_statistics_on_user_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar estadísticas del tenant del usuario modificado
    UPDATE tenant_plan_statistics 
    SET 
        usercount = (SELECT COUNT(*) FROM users u WHERE u.tenant_id::text = NEW.tenant_id AND u.is_active = true),
        updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = NEW.tenant_id;
    
    -- Si no existe registro, crearlo
    INSERT INTO tenant_plan_statistics (id, tenant_id, subscriptionplan, plan_code, quantity, usercount, monthly_cost)
    SELECT 
        gen_random_uuid()::text,
        NEW.tenant_id,
        COALESCE(t.subscriptionplan, 'BASIC'),
        CASE 
            WHEN COALESCE(t.subscriptionplan, 'BASIC') LIKE '%BASIC%' THEN 'BASIC'
            WHEN COALESCE(t.subscriptionplan, 'BASIC') LIKE '%PRO%' THEN 'PRO'
            WHEN COALESCE(t.subscriptionplan, 'BASIC') LIKE '%ENTERPRISE%' THEN 'ENTERPRISE'
            ELSE 'BASIC'
        END,
        1,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id::text = NEW.tenant_id AND u.is_active = true),
        COALESCE(t.monthlycost, 1000)
    FROM "Tenant" t
    WHERE t.id = NEW.tenant_id
    AND NOT EXISTS (SELECT 1 FROM tenant_plan_statistics WHERE tenant_id = NEW.tenant_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Paso 17: Crear trigger para actualizar estadísticas cuando cambia un usuario
DROP TRIGGER IF EXISTS trigger_update_tenant_statistics_on_user ON users;
CREATE TRIGGER trigger_update_tenant_statistics_on_user
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_statistics_on_user_change();

-- Paso 18: Verificación final
SELECT 
    'Tenant (tabla)' as table_name, 
    COUNT(*) as record_count 
FROM "Tenant"
UNION ALL
SELECT 
    'users (tabla)' as table_name, 
    COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 
    'Plan (tabla)' as table_name, 
    COUNT(*) as record_count 
FROM "Plan"
UNION ALL
SELECT 
    'tenant_plan_statistics (tabla)' as table_name, 
    COUNT(*) as record_count 
FROM tenant_plan_statistics
UNION ALL
SELECT 
    'invoice_view (vista)' as table_name, 
    COUNT(*) as record_count 
FROM invoice_view
UNION ALL
SELECT 
    'invoice_item_view (vista)' as table_name, 
    COUNT(*) as record_count 
FROM invoice_item_view
UNION ALL
SELECT 
    'tenant_plan_summary (vista)' as table_name, 
    COUNT(*) as record_count 
FROM tenant_plan_summary
UNION ALL
SELECT 
    'Tenants (vista)' as table_name, 
    COUNT(*) as record_count 
FROM "Tenants";

-- Paso 19: Mostrar estructura final de las vistas clave (versión segura)
SELECT 
    'invoice_view' as view_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'invoice_view'
ORDER BY ordinal_position

UNION ALL

SELECT 
    'invoice_item_view' as view_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'invoice_item_view'
ORDER BY ordinal_position

UNION ALL

SELECT 
    'tenant_plan_summary' as view_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tenant_plan_summary'
ORDER BY ordinal_position;
