-- Script para verificar los nombres exactos de los campos en la tabla CAI
-- Necesitamos saber si los campos se llaman como esperamos

-- 1. Verificar estructura completa de la tabla CAI
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cai' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar si hay datos en la tabla CAI
SELECT 
    'CAI data sample:' as info,
    *
FROM "cai" 
LIMIT 2;

-- 3. Verificar nombres específicos que podrían causar problemas
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'cai' 
AND table_schema = 'public'
AND (column_name LIKE '%start%' OR column_name LIKE '%end%' OR column_name LIKE '%current%' OR column_name LIKE '%date%')
ORDER BY column_name;

-- 4. Verificar si los campos que usamos existen
SELECT 
    'Field existence check:' as info,
    column_name,
    CASE 
        WHEN column_name IN ('start_number', 'end_number', 'current_number', 'issue_date', 'expiration_date', 'status', 'tenant_id') 
        THEN 'EXISTS - Used in API'
        ELSE 'NOT USED - Check API'
    END as usage_status
FROM information_schema.columns 
WHERE table_name = 'cai' 
AND table_schema = 'public'
ORDER BY column_name;
