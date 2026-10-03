-- Script para insertar datos de prueba para configuración de facturación
-- Ejecutar en orden para crear tenant, usuario y datos de facturación

-- 1. Crear Tenant de prueba (si no existe)
INSERT INTO "Tenant" (
    id, 
    businessname, 
    businessrtn, 
    businessemail, 
    businessaddress, 
    tenantcode, 
    country, 
    phonenumber,
    logourl,
    timezone,
    currency,
    subscriptionplans,
    maxusers,
    maxstorage,
    maxtransactions,
    monthlycost,
    modules,
    isactive,
    createdat,
    updatedat
) VALUES (
    'test-tenant-001',
    'Empresa de Prueba S.A.',
    '08011995012345',
    'test@empresa.com',
    'Colonia Escalón, Calle 1, Tegucigalpa, Honduras',
    'TEST001',
    'HN',
    '50422345678',
    NULL,
    'America/Tegucigalpa',
    'HNL',
    'BASIC',
    5,
    100,
    10000,
    1000,
    'billing,accounting,invoicing',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Crear Usuario de prueba asociado al tenant
-- NOTA: Reemplaza 'user_1234567890abcdef' con el ID real de Clerk del usuario actual
INSERT INTO "User" (
    id,
    email,
    firstname,
    lastname,
    role,
    tenantid,
    isactive,
    createdat,
    updatedat
) VALUES (
    'user_1234567890abcdef', -- ID de Clerk del usuario actual
    'gcalix12@hotmail.com',
    'Carlos',
    'Calix',
    'ADMIN',
    'test-tenant-001',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Insertar datos de CAI de prueba para el tenant
INSERT INTO "cai" (
    id,
    tenant_id,
    cai,
    start_number,
    end_number,
    current_number,
    issue_date,
    expiration_date,
    status,
    created_at,
    updated_at
) VALUES 
(
    'cai-test-001',
    '1', -- Usar tenant_id existente o crear uno nuevo
    'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A',
    1,
    1000,
    1,
    '2026-04-08',
    '2027-04-08',
    'active',
    NOW(),
    NOW()
),
(
    'cai-test-002',
    '1', -- Usar tenant_id existente o crear uno nuevo
    'B7E2-9F3C-5A8D-E1B4-6C7D-2F9A-8E3C',
    1001,
    2000,
    1001,
    '2026-04-08',
    '2027-04-08',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. Insertar información fiscal adicional (si existe tabla separada)
-- NOTA: Esto es opcional ya que la información fiscal está en la tabla Tenant
-- Si tienes una tabla separada para configuración fiscal, descomenta y ajusta

/*
-- Si tienes una tabla de configuración fiscal separada:
INSERT INTO "fiscal_config" (
    id,
    tenant_id,
    rtn,
    business_name,
    business_address,
    email,
    phone,
    economic_activity,
    tax_regime,
    iva_retention,
    isr_retention,
    created_at,
    updated_at
) VALUES (
    'fiscal-config-001',
    'test-tenant-001',
    '08011995012345',
    'Empresa de Prueba S.A.',
    'Colonia Escalón, Calle 1, Tegucigalpa, Honduras',
    'test@empresa.com',
    '50422345678',
    'Servicios de Tecnología',
    'REGIMEN_GENERAL',
    false,
    false,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
*/

-- 5. Verificar los datos insertados
SELECT 'Tenant creado:' as info, * FROM "Tenant" WHERE id = 'test-tenant-001';
SELECT 'Usuario creado:' as info, * FROM "User" WHERE tenant_id = 'test-tenant-001';
SELECT 'CAIs creados:' as info, * FROM "cai" WHERE tenant_id = '1';

-- 6. Consultas útiles para verificar
-- Verificar que el usuario está asociado al tenant
SELECT u.email, u.firstname, u.lastname, t.businessname, t.businessrtn
FROM "User" u
JOIN "Tenant" t ON u.tenant_id = t.id
WHERE u.id = 'user_1234567890abcdef';

-- Verificar CAIs del tenant
SELECT 
    cai,
    start_number,
    end_number,
    current_number,
    issue_date,
    expiration_date,
    status
FROM "cai" 
WHERE tenant_id = '1'
ORDER BY created_at DESC;

-- NOTAS IMPORTANTES:
-- 1. Reemplaza 'user_1234567890abcdef' con el ID real de tu usuario de Clerk
-- 2. Puedes obtener el ID de Clerk desde la consola del navegador o desde la base de datos
-- 3. Si el usuario ya existe, solo actualiza el tenantid con: UPDATE "User" SET tenantid = 'test-tenant-001' WHERE email = 'gcalix12@hotmail.com';
-- 4. Para limpiar los datos de prueba: DELETE FROM "cai" WHERE tenant_id = 'test-tenant-001'; DELETE FROM "User" WHERE tenantid = 'test-tenant-001'; DELETE FROM "Tenant" WHERE id = 'test-tenant-001';
