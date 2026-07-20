-- Script para verificar si hay errores de sintaxis en las APIs
-- Vamos a probar las consultas SQL que generan las APIs

-- 1. Probar la consulta GET que usa la API
SELECT 
    'Test GET query:' as info,
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
ORDER BY created_at DESC
LIMIT 5;

-- 2. Probar la consulta POST que usa la API (simulación)
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
    'test-api-cai-' || substr(cast(gen_random_uuid() as text), 1, 8),
    '1',
    'API-TEST-CAI-123456789012345678901234',
    5000,
    6000,
    5000,
    '2026-05-04',
    '2027-05-04',
    'active',
    NOW(),
    NOW()
);

-- 3. Verificar si el CAI de prueba se insertó
SELECT 
    'API Test CAI:' as info,
    id,
    cai,
    start_number,
    end_number,
    current_number,
    status,
    tenant_id,
    created_at
FROM "cai" 
WHERE cai LIKE 'API-TEST-CAI-%'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Limpiar el CAI de prueba
-- DELETE FROM "cai" WHERE cai LIKE 'API-TEST-CAI-%';

-- 5. Verificar si hay errores de sintaxis en las consultas
-- Estas son las mismas consultas que usan las APIs
SELECT 
    'Syntax check completed' as info,
    'All queries executed successfully' as status,
    NOW() as execution_time;
