-- ========================================
-- DIAGNÓSTICO Y CORRECCIÓN DE ESTRUCTURA DE BD
-- ========================================

-- Paso 1: Verificar qué tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Paso 2: Verificar estructura de cada tabla existente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'users', 'Plan', 'Invoice', 'InvoiceItem')
ORDER BY table_name, ordinal_position;

-- Paso 3: Verificar si las tablas de facturación existen
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Invoice' AND table_schema = 'public') 
        THEN 'Invoice table exists'
        ELSE 'Invoice table missing'
    END as invoice_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'InvoiceItem' AND table_schema = 'public') 
        THEN 'InvoiceItem table exists'
        ELSE 'InvoiceItem table missing'
    END as invoice_item_status;

-- Paso 4: Verificar columnas críticas
SELECT 
    'tenants' as table_name,
    'subscription_plan' as column_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'subscription_plan' AND table_schema = 'public') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
UNION ALL
SELECT 
    'tenants' as table_name,
    'monthly_cost' as column_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'monthly_cost' AND table_schema = 'public') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
UNION ALL
SELECT 
    'Invoice' as table_name,
    'tenant_id' as column_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Invoice' AND column_name = 'tenant_id' AND table_schema = 'public') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
UNION ALL
SELECT 
    'Invoice' as table_name,
    'invoice_number' as column_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Invoice' AND column_name = 'invoice_number' AND table_schema = 'public') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as status;

-- ========================================
-- CORRECCIONES (Ejecutar solo si es necesario)
-- ========================================

-- Si la tabla Invoice no tiene tenant_id, agregarla
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- Si la tabla Invoice no tiene las columnas necesarias, agregarlas
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS due_date TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 month');
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS period_start TIMESTAMP NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_TIMESTAMP);
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS period_end TIMESTAMP NOT NULL DEFAULT (DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month' - INTERVAL '1 day');
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS subtotal INTEGER DEFAULT 0;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS tax INTEGER DEFAULT 0;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS total INTEGER DEFAULT 0;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'HNL';
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS plans_data TEXT;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Si la tabla InvoiceItem no existe, crearla
-- CREATE TABLE IF NOT EXISTS "InvoiceItem" (
--     id TEXT PRIMARY KEY,
--     invoice_id TEXT NOT NULL,
--     plan_id TEXT NOT NULL,
--     plan_name TEXT NOT NULL,
--     quantity INTEGER NOT NULL,
--     unit_price INTEGER NOT NULL,
--     subtotal INTEGER NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Agregar claves foráneas si no existen
-- ALTER TABLE "Invoice" ADD CONSTRAINT IF NOT EXISTS fk_invoice_tenant 
--     FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- ALTER TABLE "InvoiceItem" ADD CONSTRAINT IF NOT EXISTS fk_invoice_item_invoice 
--     FOREIGN KEY (invoice_id) REFERENCES "Invoice"(id) ON DELETE CASCADE;

-- ALTER TABLE "InvoiceItem" ADD CONSTRAINT IF NOT EXISTS fk_invoice_item_plan 
--     FOREIGN KEY (plan_id) REFERENCES "Plan"(id) ON DELETE SET NULL;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================

-- Contar registros en cada tabla
SELECT 'tenants' as table_name, COUNT(*) as record_count FROM tenants
UNION ALL
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT '"Plan"' as table_name, COUNT(*) as record_count FROM "Plan"
UNION ALL
SELECT '"Invoice"' as table_name, COUNT(*) as record_count FROM "Invoice"
UNION ALL
SELECT '"InvoiceItem"' as table_name, COUNT(*) as record_count FROM "InvoiceItem";
