-- Verificar si el usuario existe en la base de datos
-- y si tiene tenant asociado

-- 1. Buscar usuario por authId (Clerk ID)
SELECT 
    'Usuario encontrado:' as info,
    id,
    email,
    auth_id,
    tenant_id,
    first_name,
    last_name,
    role,
    is_active
FROM "users" 
WHERE auth_id = 'user_3D99UNQzqAXAU7okAsQLOhK46eE';

-- 2. Verificar todos los usuarios con tenant
SELECT 
    'Usuarios con tenant:' as info,
    id,
    email,
    auth_id,
    tenant_id,
    role
FROM "users" 
WHERE tenant_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 3. Contar usuarios totales
SELECT 
    'Total usuarios:' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as users_with_tenant,
    COUNT(CASE WHEN auth_id IS NOT NULL THEN 1 END) as users_with_auth_id
FROM "users";

-- 4. Verificar si existe el tenant del usuario
SELECT 
    'Tenants disponibles:' as info,
    id as tenant_id,
    name as tenant_name,
    code as tenant_code
FROM "Tenant"
ORDER BY name;
