-- Script para desactivar temporalmente triggers que causan "Tenant or user not found"
-- durante el INSERT en la tabla CAI

-- 1. Desactivar temporalmente triggers en la tabla CAI
ALTER TABLE "cai" DISABLE TRIGGER ALL;

-- 2. Verificar triggers desactivados
SELECT 
    'Triggers en CAI:' as info,
    trigger_name,
    event_manipulation,
    action_condition,
    action_orientation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'cai';

-- 3. Intentar insertar un CAI de prueba
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
    'TEST-CAI-1234567890123456789012345',
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

-- 4. Verificar si se insertó correctamente
SELECT 
    'CAI insertado:' as info,
    id,
    cai,
    tenant_id,
    created_at
FROM "cai" 
WHERE cai = 'TEST-CAI-1234567890123456789012345';

-- 5. Reactivar triggers (descomentar después de probar)
-- ALTER TABLE "cai" ENABLE TRIGGER ALL;
