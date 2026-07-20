-- Test con CAI exactamente de 37 caracteres
-- Necesitamos ser precisos con la longitud

-- 1. Verificar la longitud exacta de los CAIs que vamos a usar
SELECT 
    'Verificación de longitudes:' as info,
    'FINAL-CAI-123456789012345678901234567' as test_cai_1,
    LENGTH('FINAL-CAI-123456789012345678901234567') as length_1,
    'SIMPLE-CAI-123456789012345678901234' as test_cai_2,
    LENGTH('SIMPLE-CAI-123456789012345678901234') as length_2;

-- 2. Crear CAI exactamente de 37 caracteres
INSERT INTO "cai" (
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
) VALUES (
    'CAI-123456789012345678901234567890',  -- Contar: 37 caracteres exactos
    1::bigint,
    100::bigint,
    1::bigint,
    CURRENT_DATE,
    '2025-12-31'::date,
    'true',
    'DENTALWD',
    NOW(),
    NOW()
);

-- 3. Verificar si el INSERT funcionó
SELECT 
    'CAI de 37 caracteres insertado:' as info,
    id,
    cai,
    LENGTH(cai) as cai_length,
    tenant_id,
    created_at,
    status
FROM "cai" 
WHERE cai = 'CAI-123456789012345678901234567890'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Probar con otro CAI de exactamente 37 caracteres
INSERT INTO "cai" (
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
) VALUES (
    'TEST-CAI-123456789012345678901234567',  -- Contar: 37 caracteres exactos
    1::bigint,
    100::bigint,
    1::bigint,
    CURRENT_DATE,
    '2025-12-31'::date,
    'true',
    'DENTALWD',
    NOW(),
    NOW()
);

-- 5. Verificar el segundo INSERT
SELECT 
    'Segundo CAI de 37 caracteres:' as info,
    id,
    cai,
    LENGTH(cai) as cai_length,
    tenant_id,
    created_at
FROM "cai" 
WHERE cai = 'TEST-CAI-123456789012345678901234567'
ORDER BY created_at DESC
LIMIT 1;

-- 6. Mostrar todos los CAIs del tenant DENTALWD
SELECT 
    'Todos los CAIs de DENTALWD:' as info,
    id,
    cai,
    LENGTH(cai) as cai_length,
    start_number,
    end_number,
    current_number,
    status,
    created_at
FROM "cai" 
WHERE tenant_id = 'DENTALWD'
ORDER BY created_at DESC;
