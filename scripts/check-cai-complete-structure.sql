-- Script para verificar la estructura COMPLETA de la tabla CAI
-- Incluyendo todos los campos posibles

-- 1. Verificar TODAS las columnas de la tabla CAI
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cai' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar si hay campos adicionales que no estamos considerando
SELECT 
    'All CAI columns:' as info,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'cai' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Contar el número exacto de columnas
SELECT 
    'Column count:' as info,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'cai' 
AND table_schema = 'public';

-- 4. Comparar con lo que esperamos
SELECT 
    'Expected vs Actual:' as info,
    'id' as expected_field,
    column_name as actual_field,
    CASE 
        WHEN column_name = 'id' THEN 'MATCH'
        ELSE 'DIFFERENT'
    END as status
FROM information_schema.columns 
WHERE table_name = 'cai' 
AND table_schema = 'public'
AND column_name IN ('id', 'tenant_id', 'cai', 'start_number', 'end_number', 'current_number', 'issue_date', 'expiration_date', 'status', 'created_at', 'updated_at', 'establishment_code', 'point_of_sale_code', 'economic_activity')
ORDER BY column_name;
