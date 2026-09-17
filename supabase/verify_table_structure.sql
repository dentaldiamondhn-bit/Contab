-- ========================================
-- VERIFICAR ESTRUCTURA DE TABLAS CAI Y TALONARIOS
-- ========================================

-- 1. Verificar estructura de tabla cai
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'cai'
ORDER BY ordinal_position;

-- 2. Verificar estructura de tabla talonarios
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'talonarios'
ORDER BY ordinal_position;

-- 3. Verificar si las tablas existen
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('cai', 'talonarios')
ORDER BY tablename;
