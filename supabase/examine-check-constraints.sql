-- Script para examinar el contenido de los CHECK constraints que causan el error
-- Necesitamos ver qué validaciones están haciendo estos constraints

-- 1. Verificar el contenido de los CHECK constraints en la tabla CAI
SELECT 
    'Contenido de CHECK constraints en CAI:' as info,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'cai'::regclass 
  AND contype = 'c'
ORDER BY conname;

-- 2. Verificar específicamente constraints relacionados con tenant
SELECT 
    'Constraints que mencionan tenant:' as info,
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'cai'::regclass 
  AND contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%tenant%'
ORDER BY conname;

-- 3. Verificar si hay constraints que mencionan user o auth
SELECT 
    'Constraints que mencionan user/auth:' as info,
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'cai'::regclass 
  AND contype = 'c'
  AND (pg_get_constraintdef(oid) ILIKE '%user%' OR pg_get_constraintdef(oid) ILIKE '%auth%')
ORDER BY conname;

-- 4. Intentar INSERT sin tenant_id para ver qué constraint falla
DO $$
BEGIN
    -- Intentar INSERT sin tenant_id para identificar el constraint problemático
    INSERT INTO "cai" (
        cai,
        start_number,
        end_number,
        current_number,
        issue_date,
        expiration_date,
        status,
        created_at,
        updated_at
    ) VALUES (
        'TEST-NO-TENANT-CAI-123456789012345678901',
        1::bigint,
        100::bigint,
        1::bigint,
        CURRENT_DATE,
        '2025-12-31'::date,
        'true',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ INSERT sin tenant_id exitoso (inesperado)';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error sin tenant_id: %', SQLERRM;
    RAISE NOTICE '❌ Constraint que falló: %', SQLSTATE;
END $$;

-- 5. Intentar INSERT con tenant_id inválido para ver el error exacto
DO $$
BEGIN
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
        'TEST-INVALID-TENANT-CAI-123456789012345678',
        1::bigint,
        100::bigint,
        1::bigint,
        CURRENT_DATE,
        '2025-12-31'::date,
        'true',
        'INVALID_TENANT',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ INSERT con tenant inválido exitoso (inesperado)';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error con tenant inválido: %', SQLERRM;
    RAISE NOTICE '❌ Constraint que falló: %', SQLSTATE;
END $$;
