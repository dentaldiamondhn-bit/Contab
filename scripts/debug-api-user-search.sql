-- Script para depurar qué está buscando la API en PostgreSQL
-- y por qué sigue fallando a pesar del workaround

-- 1. Verificar si la API está buscando por auth_id o por email
SELECT 
    'Usuario por auth_id:' as info,
    id,
    email,
    auth_id,
    tenant_id,
    role
FROM "users" 
WHERE auth_id = 'user_3D99UNQzqAXAU7okAsQLOhK46eE';

-- 2. Verificar si hay algún usuario con email gcalix12@hotmail.com
SELECT 
    'Usuario por email:' as info,
    id,
    email,
    auth_id,
    tenant_id,
    role
FROM "users" 
WHERE email = 'gcalix12@hotmail.com';

-- 3. Verificar todos los usuarios con tenant
SELECT 
    'Todos los usuarios con tenant:' as info,
    id,
    email,
    auth_id,
    tenant_id,
    role,
    created_at
FROM "users" 
WHERE tenant_id IS NOT NULL
ORDER BY created_at DESC;

-- 4. Verificar si el tenant del usuario creado existe
SELECT 
    'Tenant del usuario creado:' as info,
    id,
    business_name,
    business_email
FROM "tenant" 
WHERE id = '550e8400-e29b-41d4-a716-44665544yh30dnml8i9';

-- 5. Crear un usuario adicional con auth_id que coincida con Clerk ID
-- Esto es una solución temporal para que la API lo encuentre
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
    'user_3D99UNQzqAXAU7okAsQLOhK46eE',  -- Ahora sí usamos el Clerk ID
    '550e8400-e29b-41d4-a716-44665544yh30dnml8i9',
    'Usuario',
    'Demo',
    'ADMIN',
    true,
    NOW(),
    NOW()
);
