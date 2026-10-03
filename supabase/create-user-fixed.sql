-- Script para crear el usuario en PostgreSQL con los tipos de datos correctos
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

-- 3. Verificar tipos de datos específicos
SELECT 
    'Data types check:' as info,
    pg_typeof(id) as id_type,
    pg_typeof(auth_id) as auth_id_type,
    pg_typeof(tenant_id) as tenant_id_type
FROM "users" 
LIMIT 1;

-- 4. Insertar usuario con UUID correcto para auth_id
-- Usaremos un UUID generado en lugar del Clerk ID
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
    uuid_generate_v4(),
    'gcalix12@hotmail.com',
    'user_3D99UNQzqAXAU7okAsQLOhK46eE',  -- Clerk ID como string si el campo es text
    'DENTALWD',
    'Usuario',
    'Demo',
    'ADMIN',
    true,
    NOW(),
    NOW()
);

-- 5. Verificar si se insertó correctamente
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
