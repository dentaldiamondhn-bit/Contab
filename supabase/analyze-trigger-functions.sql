-- Script para analizar las funciones que podrían estar causando el error
-- Basado en los resultados del script anterior

-- 1. Buscar específicamente triggers en la tabla CAI
SELECT 
    'Triggers en tabla CAI:' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'cai'
ORDER BY trigger_name;

-- 2. Verificar si hay políticas RLS que verifiquen tenant/user
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

-- 3. Verificar funciones que usan set_config para tenant context
SELECT 
    'Funciones de contexto de tenant:' as info,
    proname,
    prosrc
FROM pg_proc 
WHERE prosrc ILIKE '%set_config%'
   AND prosrc ILIKE '%tenant%'
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Buscar funciones que verifican tenant_id
SELECT 
    'Funciones que verifican tenant_id:' as info,
    proname,
    prosrc
FROM pg_proc 
WHERE prosrc ILIKE '%tenant_id%'
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 10;

-- 5. Intentar identificar qué función específica lanza el error
-- Simulando el INSERT con más detalles
DO $$
BEGIN
    -- Establecer contexto de tenant (si es necesario)
    PERFORM set_config('app.current_tenant_id', 'DENTALWD', true);
    
    -- Intentar insertar con captura detallada
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
    
    RAISE NOTICE '✅ INSERT exitoso - El problema podría estar en otro lugar';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error detallado: %', SQLERRM;
    RAISE NOTICE '❌ SQLSTATE: %', SQLSTATE;
    RAISE NOTICE '❌ Contexto actual: tenant_id=%', current_setting('app.current_tenant_id', true);
END $$;

-- 6. Verificar si el problema está en RLS o en triggers
-- Deshabilitar RLS temporalmente si está habilitado
SELECT 
    'Status RLS en CAI:' as info,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'cai';

-- 7. Si RLS está habilitado, intentar deshabilitarlo temporalmente
-- ALTER TABLE "cai" DISABLE ROW LEVEL SECURITY;

-- 8. Verificar si hay triggers BEFORE INSERT específicos
SELECT 
    'Triggers BEFORE INSERT en CAI:' as info,
    trigger_name,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'cai'
  AND event_manipulation = 'INSERT'
  AND action_timing = 'BEFORE';
