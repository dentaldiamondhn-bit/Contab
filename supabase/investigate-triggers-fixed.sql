-- Script completo para investigar triggers y políticas que causan "Tenant or user not found"
-- Para uso del administrador de la base de datos

-- 1. Verificar todos los triggers en la tabla CAI
SELECT 
    'Triggers en tabla CAI:' as info,
    trigger_name,
    event_manipulation,
    action_condition,
    action_orientation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'cai'
ORDER BY trigger_name;

-- 2. Verificar políticas RLS (Row Level Security) en la tabla CAI
SELECT 
    'Políticas RLS en CAI:' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'cai';

-- 3. Verificar si RLS está habilitado en la tabla CAI
SELECT 
    'RLS status en CAI:' as info,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'cai';

-- 4. Verificar triggers relacionados con usuarios/tenants
SELECT 
    'Triggers que mencionan users/tenants:' as info,
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE action_statement ILIKE '%user%' 
   OR action_statement ILIKE '%tenant%'
   OR action_statement ILIKE '%auth%';

-- 5. Verificar funciones usadas por triggers
SELECT 
    'Funciones de triggers:' as info,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name ILIKE '%tenant%' 
   OR routine_name ILIKE '%user%'
   OR routine_name ILIKE '%auth%'
   AND routine_schema = 'public';

-- 6. Verificar constraints en la tabla CAI (corregido)
SELECT 
    'Constraints en CAI:' as info,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'cai';

-- 7. Intentar INSERT con logging detallado
DO $$
BEGIN
    -- Intentar insertar con captura de errores
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
        'DEBUG-CAI-1234567890123456789012345',
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
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error detallado: %, SQLSTATE: %', SQLERRM, SQLSTATE;
END $$;

-- 8. Verificar si el usuario actual tiene permisos
SELECT 
    'Permisos del usuario actual:' as info,
    current_user,
    session_user,
    has_schema_privilege('public', 'CREATE') as can_create,
    has_table_privilege('cai', 'INSERT') as can_insert_cai,
    has_table_privilege('cai', 'SELECT') as can_select_cai;

-- 9. Verificar roles del usuario actual
SELECT 
    'Roles del usuario actual:' as info,
    rolname,
    rolcanlogin,
    rolsuper,
    rolcreaterole,
    rolcreatedb,
    rolreplication
FROM pg_roles 
WHERE rolname = current_user;

-- 10. Verificar si hay triggers BEFORE INSERT que puedan estar causando el problema
SELECT 
    'Triggers BEFORE INSERT:' as info,
    trigger_name,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'cai'
  AND event_manipulation = 'INSERT'
  AND action_timing = 'BEFORE';

-- 11. Verificar funciones específicas que podrían causar el error
SELECT 
    'Funciones que verifican tenant/user:' as info,
    proname,
    prosrc
FROM pg_proc 
WHERE proname ILIKE '%tenant%' 
   OR proname ILIKE '%user%'
   OR proname ILIKE '%check%'
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 12. Verificar si hay alguna función que lance el error específico
SELECT 
    'Funciones con error message:' as info,
    proname,
    prosrc
FROM pg_proc 
WHERE prosrc ILIKE '%Tenant or user not found%'
   OR prosrc ILIKE '%tenant%'
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
