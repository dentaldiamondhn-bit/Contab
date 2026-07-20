-- Script para verificar políticas específicas de Supabase que podrían causar el error
-- Supabase tiene políticas adicionales que no aparecen en pg_policies estándar

-- 1. Verificar políticas RLS de Supabase específicas
SELECT 
    'Políticas RLS de Supabase en CAI:' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'cai'
ORDER BY policyname;

-- 2. Verificar si hay políticas en el schema auth (Supabase)
SELECT 
    'Políticas en schema auth:' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'auth'
ORDER BY tablename, policyname;

-- 3. Verificar si RLS está realmente deshabilitado
SELECT 
    'Status RLS en todas las tablas:' as info,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('cai', 'users', 'Tenant', 'User')
ORDER BY tablename;

-- 4. Verificar si hay alguna función de Supabase que se ejecute
SELECT 
    'Funciones de Supabase:' as info,
    proname,
    prosrc
FROM pg_proc 
WHERE proname ILIKE '%supabase_%'
   OR proname ILIKE '%auth.%'
   OR prosrc ILIKE '%supabase%'
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 10;

-- 5. Intentar INSERT con más detalles para capturar el error exacto
DO $$
BEGIN
    -- Verificar si el tenant existe antes del INSERT
    IF NOT EXISTS (SELECT 1 FROM "Tenant" WHERE id = 'DENTALWD') THEN
        RAISE NOTICE '❌ Tenant DENTALWD no existe';
    ELSE
        RAISE NOTICE '✅ Tenant DENTALWD existe';
    END IF;
    
    -- Intentar INSERT con UUID fijo para poder verificar
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
        '550e8400-e29b-41d4-a716-44665544test2',
        'SUPABASE-TEST-CAI-1234567890123456789012345',
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
    
    RAISE NOTICE '✅ INSERT con UUID fijo exitoso';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error detallado: %', SQLERRM;
    RAISE NOTICE '❌ SQLSTATE: %', SQLSTATE;
    RAISE NOTICE '❌ Contexto: current_user=%', current_user;
END $$;

-- 6. Verificar si el problema está en el rol de la conexión
SELECT 
    'Información de roles y permisos:' as info,
    current_user as usuario_actual,
    session_user as usuario_sesion,
    has_database_privilege(current_database(), 'CONNECT') as puede_conectar,
    has_schema_privilege('public', 'USAGE') as puede_usar_public,
    has_table_privilege('cai', 'INSERT') as puede_insertar_cai,
    has_table_privilege('cai', 'SELECT') as puede_seleccionar_cai;

-- 7. Verificar si hay alguna vista o regla que pueda interferir
SELECT 
    'Reglas en CAI:' as info,
    schemaname,
    tablename,
    rulename,
    definition
FROM pg_rules 
WHERE tablename = 'cai';
