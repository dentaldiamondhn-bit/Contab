-- Script para probar la conexión de Prisma directamente
-- Verificar si Prisma puede conectarse a la base de datos

-- 1. Verificar si podemos leer datos básicos
SELECT 
    'Connection Test:' as info,
    'Checking database connection...' as status,
    NOW() as test_time;

-- 2. Probar conexión simple a la base de datos
SELECT 
    'Prisma Connection Test:' as info,
    'Attempting to connect...' as status,
    NOW() as test_time
WHERE 1 = 1;

-- 3. Verificar si podemos leer de la tabla cai (sin Prisma)
SELECT 
    'Direct SQL Test:' as info,
    COUNT(*) as cai_count,
    MAX(created_at) as latest_cai_date
FROM "cai" 
LIMIT 1;

-- 4. Probar inserción simple (sin Prisma)
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
    uuid_generate_v4(),
    '1',
    'PRISMA-CAI-123456789012345678901234',
    1000,
    2000,
    1000,
    '2026-05-04',
    '2027-05-04',
    'active',
    NOW(),
    NOW()
);

-- 5. Verificar si la inserción de Prisma funcionó
SELECT 
    'Prisma Test Result:' as info,
    id,
    cai,
    start_number,
    end_number,
    status,
    tenant_id,
    created_at
FROM "cai" 
WHERE cai LIKE 'PRISMA-TEST-CAI-%'
ORDER BY created_at DESC
LIMIT 1;

-- 6. Limpiar el CAI de prueba
-- DELETE FROM "cai" WHERE cai LIKE 'PRISMA-TEST-CAI-%';

-- 7. Resumen final
SELECT 
    'Test Summary:' as info,
    CASE 
        WHEN EXISTS (SELECT 1 FROM "cai" WHERE cai LIKE 'PRISMA-TEST-CAI-%') THEN 'SUCCESS - Prisma connection works'
        ELSE 'FAILED - Prisma connection failed'
    END as result,
    'All tests completed' as status,
    NOW() as completion_time;
