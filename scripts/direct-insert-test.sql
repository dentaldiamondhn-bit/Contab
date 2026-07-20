-- Test directo de INSERT como usuario postgres para aislar el problema
-- Si esto funciona, el problema está en la conexión de la aplicación

-- 1. Verificar estructura de la tabla CAI
SELECT 
    'Estructura de tabla CAI:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cai' 
ORDER BY ordinal_position;

-- 2. Verificar si existe el tenant DENTALWD
SELECT 
    'Verificación de tenant DENTALWD:' as info,
    id,
    businessname,
    isactive
FROM "Tenant" 
WHERE id = 'DENTALWD';

-- 3. INSERT directo sin UUID (usando uuid_generate_v4())
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
    'DIRECT-TEST-CAI-1234567890123456789012345',
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

-- 4. Verificar si el INSERT funcionó
SELECT 
    'CAI insertado exitosamente:' as info,
    id,
    cai,
    tenant_id,
    created_at,
    status
FROM "cai" 
WHERE cai = 'DIRECT-TEST-CAI-1234567890123456789012345'
ORDER BY created_at DESC
LIMIT 1;

-- 5. Si el anterior funcionó, probar con UUID específico
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
    '550e8400-e29b-41d4-a716-44665544test3',
    'UUID-TEST-CAI-1234567890123456789012345',
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
    tenant_id,
    created_at,
    status
FROM "cai" 
WHERE cai = 'UUID-TEST-CAI-1234567890123456789012345'
ORDER BY created_at DESC
LIMIT 1;

-- 7. Contar cuántos CAIs existen ahora
SELECT 
    'Total de CAIs en la base de datos:' as info,
    COUNT(*) as total_cais
FROM "cai";

-- 8. Mostrar todos los CAIs del tenant DENTALWD
SELECT 
    'Todos los CAIs de DENTALWD:' as info,
    id,
    cai,
    start_number,
    end_number,
    current_number,
    status,
    created_at
FROM "cai" 
WHERE tenant_id = 'DENTALWD'
ORDER BY created_at DESC;
