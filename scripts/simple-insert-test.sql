-- Script simple para probar inserción de CAI
-- Sin complejidad, solo lo básico

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
    'test-simple-cai-final',
    '1',
    'SIMPLE-CAI-123456789012345678901234',
    100,
    200,
    100,
    '2026-05-04',
    '2027-05-04',
    'active',
    NOW(),
    NOW()
);

-- Verificar si se insertó
SELECT 
    'Inserted simple CAI:' as info,
    id,
    cai,
    start_number,
    end_number,
    current_number,
    status,
    tenant_id,
    created_at
FROM "cai" 
WHERE id = 'test-simple-cai-final';
