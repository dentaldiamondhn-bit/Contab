-- Test para simular la conexión de la aplicación
-- Verificar si el problema está en el usuario de conexión de la aplicación

-- 1. Verificar qué usuario está usando la aplicación
SELECT 
    'Usuario actual de la aplicación:' as info,
    current_user as usuario_actual,
    session_user as usuario_sesion,
    current_database() as base_datos;

-- 2. Verificar si el tenant del usuario existe
SELECT 
    'Verificación de tenant DENTALWD:' as info,
    id,
    businessname,
    isactive
FROM "Tenant" 
WHERE id = 'DENTALWD';

-- 3. Verificar si el usuario de la aplicación tiene acceso al tenant
-- (simulando la consulta que hace la aplicación)
SELECT 
    'Simulación de consulta de aplicación:' as info,
    'SELECT * FROM cai WHERE tenant_id = DENTALWD' as consulta_simulada;

-- 4. Intentar SELECT como lo haría la aplicación
SELECT 
    'Intentando SELECT como aplicación:' as info,
    id,
    cai,
    tenant_id,
    created_at
FROM "cai" 
WHERE tenant_id = 'DENTALWD'
LIMIT 1;

-- 5. Intentar INSERT simple como lo haría la aplicación
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
        'APP-TEST-CAI-123456789012345678901234',
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
    
    RAISE NOTICE '✅ INSERT exitoso como aplicación';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error en INSERT como aplicación: %', SQLERRM;
    RAISE NOTICE '❌ SQLSTATE: %', SQLSTATE;
END $$;

-- 6. Verificar permisos del usuario actual
SELECT 
    'Permisos del usuario actual:' as info,
    has_database_privilege(current_database(), 'CONNECT') as puede_conectar,
    has_schema_privilege('public', 'USAGE') as puede_usar_public,
    has_table_privilege('cai', 'INSERT') as puede_insertar_cai,
    has_table_privilege('cai', 'SELECT') as puede_seleccionar_cai,
    has_table_privilege('Tenant', 'SELECT') as puede_ver_tenant;

-- 7. Verificar si hay alguna restricción en la tabla CAI
SELECT 
    'Restricciones en tabla CAI:' as info,
    tc.constraint_name,
    tc.constraint_type,
    tc.is_deferrable
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'cai'
ORDER BY tc.constraint_type;
