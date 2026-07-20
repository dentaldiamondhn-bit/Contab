-- Script para verificar la estructura exacta de las tablas
-- Ejecuta esto primero para ver los nombres reales de las columnas

-- 1. Verificar estructura de la tabla Tenant
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Tenant' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar estructura de la tabla User
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'User' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar estructura de la tabla CAI
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cai' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar si las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('Tenant', 'User', 'cai')
ORDER BY table_name;

-- 5. Mostrar algunos datos existentes (si hay)
SELECT 'Tenant data:' as info, * FROM "Tenant" LIMIT 1;
SELECT 'User data:' as info, * FROM "User" LIMIT 1;
SELECT 'CAI data:' as info, * FROM "cai" LIMIT 1;
