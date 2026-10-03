-- Script para crear el usuario actual en PostgreSQL
-- Esto resolverá el problema "Tenant or user not found"

-- 1. Verificar si el usuario ya existe
SELECT 
    'Usuario existente:' as info,
    id,
    email,
    auth_id,
    tenant_id,
    created_at
FROM "users" 
WHERE auth_id = 'user_3D99UNQzqAXAU7okAsQLOhK46eE';

-- 2. Insertar el usuario si no existe
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
    'user_3D99UNQzqAXAU7okAsQLOhK46eE',
    'DENTALWD',
    'Usuario',
    'Demo',
    'ADMIN',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (auth_id) DO NOTHING;

-- 3. Verificar si se insertó correctamente
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
WHERE auth_id = 'user_3D99UNQzqAXAU7okAsQLOhK46eE';

-- 4. Verificar que el tenant existe
SELECT 
    'Tenant verificado:' as info,
    id,
    name,
    code,
    created_at
FROM "Tenant" 
WHERE id = 'DENTALWD';
