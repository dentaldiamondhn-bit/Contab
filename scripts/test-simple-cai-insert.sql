-- Script para probar inserción simple de CAI
-- Sin BigInt, sin campos complejos, solo lo básico

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
    '22302117-3ee7-4268-bd15-5ee3285813c3',
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

-- 2. Verificar si se insertó
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
WHERE id = '22302117-3ee7-4268-bd15-5ee3285813c3';

-- 3. Limpiar el CAI de prueba
-- DELETE FROM "cai" WHERE id = '22302117-3ee7-4268-bd15-5ee3285813c3';
