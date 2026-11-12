-- Script funcional para insertar CAI con UUID generado por PostgreSQL
-- Basado en los resultados de las pruebas anteriores

-- 1. Insertar CAI usando UUID generado por PostgreSQL
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
    'WORKING-CAI-123456789012345678901234',
    1000,
    2000,
    1000,
    '2026-05-04',
    '2027-05-04',
    'active',
    NOW(),
    NOW()
);

-- 2. Verificar si el CAI se insertó correctamente
SELECT 
    'Working CAI inserted:' as info,
    id,
    cai,
    start_number,
    end_number,
    current_number,
    status,
    tenant_id,
    created_at
FROM "cai" 
WHERE cai LIKE 'WORKING-CAI-%'
ORDER BY created_at DESC
LIMIT 1;

-- 3. Limpiar el CAI de prueba (descomentado para que puedas verificar primero)
-- DELETE FROM "cai" WHERE cai LIKE 'WORKING-CAI-%';
