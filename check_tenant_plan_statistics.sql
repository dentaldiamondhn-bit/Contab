-- ========================================
-- VERIFICACIÓN DE TABLA tenant_plan_statistics
-- ========================================

-- Verificar estructura de la tabla tenant_plan_statistics
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'tenant_plan_statistics' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar si tiene datos
SELECT COUNT(*) as record_count FROM tenant_plan_statistics;

-- Mostrar algunos registros si existen
SELECT * FROM tenant_plan_statistics LIMIT 5;

-- Verificar relaciones con otras tablas
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'tenant_plan_statistics'
AND tc.table_schema = 'public'
AND tc.constraint_type IN ('FOREIGN KEY', 'PRIMARY KEY');
