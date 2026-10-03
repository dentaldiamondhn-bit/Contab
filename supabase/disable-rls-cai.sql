-- Script para deshabilitar RLS en la tabla CAI y permitir operaciones
-- Como administrador, puedes ejecutar esto para resolver el problema

-- 1. Deshabilitar RLS en la tabla CAI
ALTER TABLE "cai" DISABLE ROW LEVEL SECURITY;

-- 2. Verificar que RLS esté deshabilitado
SELECT 
    'RLS status en CAI después de deshabilitar:' as info,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'cai';

-- 3. Intentar INSERT de prueba para verificar que funciona
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
        'TEST-RLS-CAI-1234567890123456789012345',
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
    
    RAISE NOTICE '✅ INSERT exitoso - RLS deshabilitado correctamente';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error después de deshabilitar RLS: %', SQLERRM;
END $$;

-- 4. Verificar si el CAI se insertó correctamente
SELECT 
    'CAI insertado después de deshabilitar RLS:' as info,
    id,
    cai,
    tenant_id,
    created_at
FROM "cai" 
WHERE cai = 'TEST-RLS-CAI-1234567890123456789012345'
ORDER BY created_at DESC
LIMIT 1;

-- 5. Opcional: Si necesitas volver a habilitar RLS más tarde
-- ALTER TABLE "cai" ENABLE ROW LEVEL SECURITY;

-- 6. Para verificar políticas RLS existentes (si necesitas revisarlas)
SELECT 
    'Políticas RLS en CAI (después de deshabilitar):' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'cai';
