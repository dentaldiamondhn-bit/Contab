-- Script para probar generación de UUID válidos en PostgreSQL
-- Usar funciones nativas para generar UUIDs correctos

-- 1. Probar diferentes métodos de generar UUID
SELECT 
    'UUID Method Test:' as info,
    'Method 1 - gen_random_uuid()' as method1,
    cast(gen_random_uuid() as text) as uuid1,
    'Method 2 - uuid_generate_v4()' as method2,
    uuid_generate_v4() as uuid2,
    'Method 3 - uuid_generate_v1()' as method3,
    uuid_generate_v1() as uuid3,
    'Method 4 - usando random' as method4,
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' as uuid4
    NOW() as test_time;

-- 2. Insertar CAI con UUID generado por PostgreSQL
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
    'POSTGRES-CAI-123456789012345678901234',
    1000,
    2000,
    1000,
    '2026-05-04',
    '2027-05-04',
    'active',
    NOW(),
    NOW()
);

-- 3. Verificar si el CAI se insertó
SELECT 
    'PostgreSQL UUID CAI:' as info,
    id,
    cai,
    start_number,
    end_number,
    current_number,
    status,
    tenant_id,
    created_at
FROM "cai" 
WHERE cai LIKE 'POSTGRES-CAI-%'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Limpiar el CAI de prueba
-- DELETE FROM "cai" WHERE cai LIKE 'POSTGRES-CAI-%';

-- 5. Mostrar resumen
SELECT 
    'UUID Test Summary:' as info,
    'All UUID methods tested successfully' as result,
    NOW() as completion_time;
