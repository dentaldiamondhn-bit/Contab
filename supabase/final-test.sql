-- Script final para probar la inserción de CAI
-- Versión simplificada para aislar el problema

-- 1. Insertar CAI simple
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
    'final-test-cai-001',
    '1',
    'FINAL-CAI-123456789012345678901234',
    100,
    200,
    100,
    '2026-05-04',
    '2027-05-04',
    'active',
    NOW(),
    NOW()
);

-- 2. Verificar si se insertó
SELECT 
    'Final test CAI:' as info,
    id,
    cai,
    start_number,
    end_number,
    current_number,
    status,
    tenant_id,
    created_at
FROM "cai" 
WHERE id = 'final-test-cai-001';

-- 3. Limpiar el CAI de prueba
-- DELETE FROM "cai" WHERE id = 'final-test-cai-001';

-- 4. Verificar todos los CAIs del tenant
SELECT 
    'All CAIs for tenant:' as info,
    COUNT(*) as total_cais,
    id,
    cai,
    start_number,
    end_number,
    current_number,
    status,
    tenant_id,
    created_at
FROM "cai" 
WHERE tenant_id = '1'
ORDER BY created_at DESC;
