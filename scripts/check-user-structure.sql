-- Script para verificar la estructura exacta de la tabla User
-- Necesitamos saber si el campo se llama tenant_id o tenantid

-- 1. Verificar estructura de la tabla User
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'User' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar si hay datos en la tabla User
SELECT 
    'User data sample:' as info,
    *
FROM "User" 
LIMIT 3;

-- 3. Verificar los nombres exactos de las columnas que contienen 'tenant'
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'User' 
AND table_schema = 'public'
AND (column_name LIKE '%tenant%' OR column_name LIKE '%Tenant%')
ORDER BY column_name;

-- 4. Verificar si el usuario actual existe
SELECT 
    'Current user check:' as info,
    id,
    email,
    firstname,
    lastname,
    role,
    tenantid,
    tenant_id
FROM "User" 
WHERE email = 'gcalix12@hotmail.com';
