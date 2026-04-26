-- ========================================
-- VERIFICACIÓN COMPLETA DE TABLAS EXISTENTES
-- ========================================

-- Paso 1: Verificar todas las tablas existentes
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Paso 2: Buscar tablas que podrían ser las principales con nombres similares
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name ILIKE '%tenant%' OR 
    table_name ILIKE '%invoice%' OR 
    table_name ILIKE '%user%' OR
    table_name ILIKE '%plan%'
)
ORDER BY table_name;

-- Paso 3: Verificar estructura de las tablas principales encontradas
-- Primero, obtener los nombres de las tablas relevantes
WITH relevant_tables AS (
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (
        table_name ILIKE '%tenant%' OR 
        table_name ILIKE '%invoice%' OR 
        table_name ILIKE '%user%' OR
        table_name ILIKE '%plan%'
    )
)
-- Luego, obtener las columnas de esas tablas
SELECT 
    rt.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM relevant_tables rt
JOIN information_schema.columns c ON rt.table_name = c.table_name AND c.table_schema = 'public'
ORDER BY rt.table_name, c.ordinal_position;

-- Paso 4: Contar registros en las tablas principales (versión simplificada)
SELECT 
    'Plan' as table_name,
    (SELECT COUNT(*) FROM "Plan") as record_count
UNION ALL
SELECT 
    'tenant_plan_statistics' as table_name,
    (SELECT COUNT(*) FROM tenant_plan_statistics) as record_count
UNION ALL
SELECT 
    'users' as table_name,
    (SELECT COUNT(*) FROM users) as record_count
UNION ALL
SELECT 
    'Invoice' as table_name,
    (SELECT COUNT(*) FROM "Invoice") as record_count
UNION ALL
SELECT 
    'InvoiceItem' as table_name,
    (SELECT COUNT(*) FROM "InvoiceItem") as record_count
UNION ALL
SELECT 
    'Tenant' as table_name,
    (SELECT COUNT(*) FROM "Tenant") as record_count;

-- Paso 5: Verificar si hay vistas relacionadas
SELECT 
    table_name,
    view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;
