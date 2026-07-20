-- Script específico para verificar triggers y constraints en la tabla CAI
-- El problema persiste así que necesitamos revisar más a fondo

-- 1. Verificar triggers específicos en CAI (consulta más específica)
SELECT 
    'Triggers específicos en CAI:' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'cai'
ORDER BY trigger_name;

-- 2. Verificar constraints en CAI que puedan causar el error
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'cai'
ORDER BY tc.constraint_type;

-- 3. Verificar foreign keys en CAI
SELECT 
    'Foreign Keys en CAI:' as info,
    kcu.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'cai';

-- 4. Verificar si hay alguna función que se ejecute automáticamente en INSERT a CAI
SELECT 
    'Funciones que podrían ejecutarse en CAI:' as info,
    proname,
    prosrc
FROM pg_proc 
WHERE prosrc ILIKE '%cai%'
   OR prosrc ILIKE '%insert%'
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 10;

-- 5. Intentar INSERT simple para ver el error exacto
DO $$
BEGIN
    -- Intentar el INSERT más simple posible
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
        '550e8400-e29b-41d4-a716-44665544test1',
        'TEST-CAI-1234567890123456789012345',
        1,
        100,
        1,
        CURRENT_DATE,
        '2025-12-31',
        'true',
        'DENTALWD',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ INSERT simple exitoso';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error en INSERT simple: %', SQLERRM;
    RAISE NOTICE '❌ SQLSTATE: %', SQLSTATE;
END $$;

-- 6. Verificar si el problema está en la conexión o configuración
SELECT 
    'Configuración de conexión:' as info,
    current_database(),
    current_user,
    session_user,
    version();
