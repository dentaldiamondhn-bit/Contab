-- Script SQL para verificar y validar roles de usuarios
-- Ejecutar en tu base de datos PostgreSQL

-- 1. Verificar estructura de la tabla users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Contar usuarios por rol
SELECT 
    role,
    COUNT(*) as user_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
FROM users 
GROUP BY role 
ORDER BY user_count DESC;

-- 3. Verificar usuarios con tenantId null (deberían ser solo SUPER_ADMIN)
SELECT 
    id,
    email,
    role,
    tenant_id,
    is_active,
    created_at
FROM users 
WHERE tenant_id IS NULL
ORDER BY created_at;

-- 4. Verificar usuarios activos por tenant
SELECT 
    t.business_name,
    u.role,
    COUNT(*) as user_count,
    STRING_AGG(u.email, ', ') as users
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.is_active = true
    AND u.tenant_id IS NOT NULL
GROUP BY t.business_name, u.role
ORDER BY t.business_name, u.role;

-- 5. Verificar usuarios sin authId (creados manualmente)
SELECT 
    id,
    email,
    role,
    tenant_id,
    is_active,
    created_at
FROM users 
WHERE auth_id IS NULL
ORDER BY created_at;

-- 6. Validar que los roles sean válidos
SELECT 
    id,
    email,
    role,
    CASE 
        WHEN role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'VIEWER') 
        THEN 'INVALID_ROLE'
        ELSE 'VALID'
    END as role_validation
FROM users 
WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'VIEWER')
    OR role IS NULL;

-- 7. Verificar duplicados por email
SELECT 
    email,
    COUNT(*) as duplicate_count,
    STRING_AGG(id, ', ') as user_ids,
    STRING_AGG(role, ', ') as roles
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 8. Usuarios creados recientemente (últimos 7 días)
SELECT 
    id,
    email,
    role,
    tenant_id,
    is_active,
    created_at
FROM users 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 9. Actualizar roles inválidos a USER (opcional)
-- UPDATE users 
-- SET role = 'USER' 
-- WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'VIEWER')
--    OR role IS NULL;

-- 10. Crear primer SUPER_ADMIN si no existe (opcional)
-- INSERT INTO users (id, email, role, tenant_id, is_active, created_at, updated_at)
-- SELECT 
--     gen_random_uuid(),
--     'admin@tudominio.com',
--     'SUPER_ADMIN',
--     NULL,
--     true,
--     NOW(),
--     NOW()
-- WHERE NOT EXISTS (
--     SELECT 1 FROM users WHERE role = 'SUPER_ADMIN'
-- );

-- 11. Verificar configuración de RLS (Row Level Security)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 12. Estadísticas generales
SELECT 
    'Total Usuarios' as metric,
    COUNT(*) as value
FROM users
UNION ALL
SELECT 
    'Usuarios Activos' as metric,
    COUNT(*) as value
FROM users 
WHERE is_active = true
UNION ALL
SELECT 
    'SUPER_ADMIN' as metric,
    COUNT(*) as value
FROM users 
WHERE role = 'SUPER_ADMIN'
UNION ALL
SELECT 
    'ADMIN' as metric,
    COUNT(*) as value
FROM users 
WHERE role = 'ADMIN'
UNION ALL
SELECT 
    'MANAGER' as metric,
    COUNT(*) as value
FROM users 
WHERE role = 'MANAGER'
UNION ALL
SELECT 
    'USER' as metric,
    COUNT(*) as value
FROM users 
WHERE role = 'USER'
UNION ALL
SELECT 
    'VIEWER' as metric,
    COUNT(*) as value
FROM users 
WHERE role = 'VIEWER';
