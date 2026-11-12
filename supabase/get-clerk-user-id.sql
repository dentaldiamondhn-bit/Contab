-- Script para obtener el ID de Clerk del usuario actual
-- Ejecuta esta consulta para encontrar tu ID de usuario

-- 1. Buscar usuario por email
SELECT 
    id,
    email,
    firstname,
    lastname,
    role,
    tenantid,
    isactive,
    createdat
FROM "User" 
WHERE email = 'gcalix12@hotmail.com';

-- 2. Si no encuentras el usuario, busca todos los usuarios
SELECT 
    id,
    email,
    firstname,
    lastname,
    role,
    tenantid,
    isactive,
    createdat
FROM "User" 
ORDER BY createdat DESC;

-- 3. Una vez que tengas el ID, úsalo en el script principal
-- El ID debería verse algo como: 'user_1234567890abcdefghijklmnop'

-- 4. Si necesitas actualizar un usuario existente para asociarlo a un tenant:
UPDATE "User" 
SET tenantid = 'test-tenant-001' 
WHERE email = 'gcalix12@hotmail.com';

-- 5. Verificar la actualización
SELECT 
    u.id,
    u.email,
    u.firstname,
    u.lastname,
    u.tenantid,
    t.businessname,
    t.businessrtn
FROM "User" u
LEFT JOIN "Tenant" t ON u.tenantid = t.id
WHERE u.email = 'gcalix12@hotmail.com';
