-- Script para verificar los datos en la tabla tenant (minúscula)
-- y crear el usuario con el tenant correcto

-- 1. Verificar todos los tenants en la tabla tenant
SELECT 
    'Tenants disponibles en tabla tenant:' as info,
    id,
    business_name,
    business_email,
    created_at
FROM "tenant"
ORDER BY business_name;

-- 2. Verificar estructura de la tabla tenant
SELECT 
    'tenant columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tenant'
ORDER BY ordinal_position;

-- 3. Insertar usuario con el primer tenant disponible
-- Usaremos el primer tenant que encuentremos
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
    (SELECT id FROM "tenant" LIMIT 1),  -- Usar el primer tenant disponible
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
