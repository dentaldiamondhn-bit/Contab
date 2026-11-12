-- Script para debuggear el API de CAI paso a paso
-- Vamos a aislar el problema

-- 1. Verificar si el usuario actual tiene tenantid
SELECT 
    'User tenant check:' as info,
    id,
    email,
    tenantid
FROM "User" 
WHERE email = 'gcalix12@hotmail.com';

-- 2. Verificar si hay CAIs para ese tenant
SELECT 
    'CAIs for tenant:' as info,
    COUNT(*) as cai_count
FROM "cai" 
WHERE tenant_id = '1';

-- 3. Intentar insertar un CAI manualmente (sin BigInt)
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
    'debug-cai-simple-test',
    '1',
    'DEBUG-CAI-123456789012345678901234567',
    2000,
    3000,
    2000,
    '2026-05-04',
    '2027-05-04',
    'active',
    NOW(),
    NOW(),
    '001',
    '001',
    'Servicios de software'
);

-- 4. Verificar si el CAI se insertó
SELECT 
    'Inserted CAI:' as info,
    *
FROM "cai" 
WHERE cai LIKE 'DEBUG-CAI-%'
ORDER BY created_at DESC
LIMIT 1;

-- 5. Limpiar el CAI de prueba
-- DELETE FROM "cai" WHERE cai LIKE 'DEBUG-CAI-%';

-- 6. Verificar estructura de datos esperados por el frontend
SELECT 
    'Sample CAI data:' as info,
    id,
    cai,
    start_number,
    end_number,
    current_number,
    issue_date,
    expiration_date,
    status,
    tenant_id,
    created_at,
    updated_at
FROM "cai" 
WHERE tenant_id = '1'
LIMIT 1;
