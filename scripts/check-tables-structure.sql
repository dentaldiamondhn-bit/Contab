-- Script para verificar la estructura exacta de las tablas
-- y corregir los tipos de datos

-- 1. Verificar estructura de la tabla users
SELECT 
    'Users columns:' as info,
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 2. Verificar estructura de la tabla Tenant
SELECT 
    'Tenant columns:' as info,
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'Tenant'
ORDER BY ordinal_position;

-- 3. Verificar usuarios existentes
SELECT 
    'Usuarios existentes:' as info,
    id,
    email,
    auth_id,
    tenant_id,
    role,
    created_at
FROM "users" 
LIMIT 5;

-- 4. Verificar tenants disponibles
SELECT 
    'Tenants disponibles:' as info,
    *
FROM "Tenant"
ORDER BY id
LIMIT 5;
