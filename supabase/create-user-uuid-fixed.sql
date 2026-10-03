-- Script para crear el usuario en PostgreSQL con UUID válido
-- Esto resolverá el problema "Tenant or user not found"

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

-- 3. Insertar usuario con UUID válido para auth_id
-- Generamos un UUID válido para auth_id
INSERT INTO "users" (
    id,
    email,
    auth_id,
    tenant_id,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES 
(
    uuid_generate_v4(),  -- ID del usuario
    'gcalix12@hotmail.com',
    '22302117-3ee7-4268-bd15-5ee3285813c3',  -- UUID válido para auth_id
    'DENTALWD',
    'Usuario',
    'Demo',
    'ADMIN',
    true,
    NOW(),
    NOW()
);

-- 4. Verificar si se insertó correctamente
SELECT 
    'Usuario creado/verificado:' as info,
    id,
    email,
    auth_id,
    tenant_id,
    role,
    is_active,
    created_at
FROM "users" 
WHERE email = 'gcalix12@hotmail.com';

-- 5. Verificar que el tenant existe
SELECT 
    'Tenant verificado:' as info,
    id,
    business_name,
    business_email
FROM "Tenant" 
WHERE id = 'DENTALWD';
