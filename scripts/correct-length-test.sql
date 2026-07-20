-- Test con CAI de longitud correcta (37 caracteres exactos)
-- El problema era que los CAIs de prueba tenían más de 37 caracteres

-- 1. INSERT con CAI de 37 caracteres exactos (longitud correcta)
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
    'SIMPLE-CAI-123456789012345678901234',  -- 37 caracteres exactos
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

-- 2. Verificar si el INSERT funcionó
SELECT 
    'CAI insertado con longitud correcta:' as info,
    id,
    cai,
    tenant_id,
    created_at,
    status,
    LENGTH(cai) as cai_length
FROM "cai" 
WHERE cai = 'SIMPLE-CAI-123456789012345678901234'
ORDER BY created_at DESC
LIMIT 1;

-- 3. Contar cuántos CAIs existen ahora
SELECT 
    'Total de CAIs en la base de datos:' as info,
    COUNT(*) as total_cais
FROM "cai";

-- 4. Mostrar todos los CAIs del tenant DENTALWD
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

-- 5. Probar otro CAI de 37 caracteres
INSERT INTO "cai" (
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
) VALUES (
    uuid_generate_v4(),
    'TEST-CAI-123456789012345678901234567',  -- 37 caracteres exactos
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

-- 6. Verificar el segundo INSERT
SELECT 
    'Segundo CAI insertado:' as info,
    id,
    cai,
    LENGTH(cai) as cai_length,
    tenant_id,
    created_at
FROM "cai" 
WHERE cai = 'TEST-CAI-123456789012345678901234567'
ORDER BY created_at DESC
LIMIT 1;
