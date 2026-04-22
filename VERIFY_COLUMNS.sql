-- =====================================================
-- VERIFICAR EXACTAMENTE QUÉ COLUMNAS EXISTEN
-- =====================================================

-- Verificar todas las columnas de la tabla Product con sus nombres exactos
SELECT 
    column_name,
    table_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product'
ORDER BY ordinal_position;

-- Verificar específicamente columnas relacionadas con stock
SELECT 
    column_name,
    table_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND (column_name ILIKE '%stock%' OR column_name ILIKE '%min%')
ORDER BY column_name;

-- Verificar si hay diferencias de mayúsculas/minúsculas
SELECT 
    column_name,
    LOWER(column_name) as column_name_lower,
    UPPER(column_name) as column_name_upper,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name ILIKE '%stock%'
ORDER BY column_name;
