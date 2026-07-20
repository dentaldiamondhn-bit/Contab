-- Script para verificar la estructura exacta de la tabla users
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

-- 2. Verificar usuarios existentes
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

-- 3. Verificar si auth_id es realmente uuid o text
SELECT 
    'auth_id type check:' as info,
    pg_typeof(auth_id) as auth_id_type,
    pg_typeof(id) as id_type,
    pg_typeof(tenant_id) as tenant_id_type
FROM "users" 
LIMIT 1;

-- 4. Verificar tenants disponibles
SELECT 
    'Tenants disponibles:' as info,
    id,
    name,
    code
FROM "Tenant"
ORDER BY name;
