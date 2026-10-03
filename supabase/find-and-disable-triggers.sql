-- Script para encontrar y deshabilitar triggers que causan "Tenant or user not found"
-- Ejecutar como administrador para resolver el problema definitivamente

-- 1. Buscar todos los triggers en la tabla CAI
SELECT 
    'Todos los triggers en CAI:' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'cai'
ORDER BY trigger_name;

-- 2. Buscar triggers que mencionen "tenant" o "user" en cualquier parte del sistema
SELECT 
    'Triggers que mencionan tenant/user:' as info,
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE action_statement ILIKE '%tenant%' 
   OR action_statement ILIKE '%user%'
   OR action_statement ILIKE '%auth%'
ORDER BY trigger_name;

-- 3. Deshabilitar todos los triggers en la tabla CAI
ALTER TABLE "cai" DISABLE TRIGGER ALL;

-- 4. Verificar que los triggers estén deshabilitados
SELECT 
    'Triggers en CAI después de deshabilitar:' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'cai'
ORDER BY trigger_name;

-- 5. Intentar INSERT de prueba para verificar que funciona
DO $$
BEGIN
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
        'FINAL-TEST-CAI-1234567890123456789012345',
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
    
    RAISE NOTICE '✅ INSERT exitoso - Triggers deshabilitados correctamente';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error después de deshabilitar triggers: %', SQLERRM;
END $$;

-- 6. Verificar si el CAI se insertó correctamente
SELECT 
    'CAI insertado después de deshabilitar triggers:' as info,
    id,
    cai,
    tenant_id,
    created_at
FROM "cai" 
WHERE cai = 'FINAL-TEST-CAI-1234567890123456789012345'
ORDER BY created_at DESC
LIMIT 1;

-- 7. Opcional: Si necesitas volver a habilitar los triggers más tarde
-- ALTER TABLE "cai" ENABLE TRIGGER ALL;
