-- Script para verificar la conexión a la base de datos
-- y diagnosticar problemas de autenticación

-- 1. Verificar conexión básica
SELECT 
    'Conexión exitosa' as status,
    version() as postgres_version,
    current_database() as database_name,
    current_user as current_user;

-- 2. Verificar tablas existentes
SELECT 
    'Tablas disponibles:' as info,
    schemaname,
    tablename
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename
LIMIT 10;

-- 3. Verificar si podemos leer de CAI
SELECT 
    'CAI count:' as info,
    COUNT(*) as total_cais
FROM "cai";

-- 4. Verificar estructura de la tabla CAI
SELECT 
    'CAI columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'cai'
ORDER BY ordinal_position;
