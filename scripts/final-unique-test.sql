-- Test final con CAI único de 37 caracteres
-- Ahora que sabemos que 37 caracteres funciona, probemos con un CAI único

-- 1. Verificar qué CAIs ya existen para evitar duplicados
SELECT 
    'CAIs existentes en DENTALWD:' as info,
    cai,
    LENGTH(cai) as cai_length,
    created_at
FROM "cai" 
WHERE tenant_id = 'DENTALWD'
ORDER BY created_at DESC;

-- 2. INSERT con CAI único de 37 caracteres
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
    'FINAL-CAI-123456789012345678901234567',  -- 37 caracteres, único
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
    'CAI único insertado exitosamente:' as info,
    id,
    cai,
    LENGTH(cai) as cai_length,
    tenant_id,
    created_at,
    status
FROM "cai" 
WHERE cai = 'FINAL-CAI-123456789012345678901234567'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Contar total de CAIs
SELECT 
    'Total de CAIs en la base de datos:' as info,
    COUNT(*) as total_cais
FROM "cai";

-- 5. Mostrar todos los CAIs del tenant DENTALWD
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

-- 6. Probar con otro tenant para confirmar que funciona
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
    'TST021-CAI-123456789012345678901234567',  -- 37 caracteres, para otro tenant
    1::bigint,
    100::bigint,
    1::bigint,
    CURRENT_DATE,
    '2025-12-31'::date,
    'true',
    'TST021TI',
    NOW(),
    NOW()
);

-- 7. Verificar el INSERT para otro tenant
SELECT 
    'CAI para TST021TI insertado:' as info,
    id,
    cai,
    LENGTH(cai) as cai_length,
    tenant_id,
    created_at
FROM "cai" 
WHERE cai = 'TST021-CAI-123456789012345678901234567'
ORDER BY created_at DESC
LIMIT 1;
