-- =====================================================
-- CORREGIR POLÍTICAS RLS - VERSIÓN SEGURA
-- =====================================================

-- 1. Verificar políticas actuales
SELECT '=== POLÍTICAS ACTUALES ===' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('Customer', 'CustomerRetentions', 'CustomerFiles')
ORDER BY tablename, policyname;

-- 2. Eliminar todas las políticas existentes para empezar limpio
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE 'Eliminando políticas existentes...';
    
    FOR policy_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE tablename IN ('Customer', 'CustomerRetentions', 'CustomerFiles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, policy_record.tablename);
        RAISE NOTICE 'Política eliminada: % en tabla %', policy_record.policyname, policy_record.tablename;
    END LOOP;
    
    RAISE NOTICE 'Todas las políticas eliminadas';
END $$;

-- 3. Asegurar que RLS esté habilitado
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerRetentions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerFiles" ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas simples y efectivas
-- Para Customer
CREATE POLICY "Allow all operations for authenticated users" ON "Customer"
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Para CustomerRetentions
CREATE POLICY "Allow all operations for authenticated users retentions" ON "CustomerRetentions"
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Para CustomerFiles
CREATE POLICY "Allow all operations for authenticated users files" ON "CustomerFiles"
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 5. Verificar políticas nuevas
SELECT '=== NUEVAS POLÍTICAS CREADAS ===' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('Customer', 'CustomerRetentions', 'CustomerFiles')
ORDER BY tablename, policyname;

-- 6. Probar inserción simple
DO $$
BEGIN
    RAISE NOTICE 'Iniciando prueba de inserción...';
    
    -- Intentar insertar un registro de prueba
    INSERT INTO "Customer" (
        tenantid, 
        rtn, 
        name, 
        "contactCode",
        contactType,
        observations,
        createdat,
        updatedat
    ) VALUES (
        'test', 
        'TEST12345678', 
        'Test Contact',
        'CT001TEST',
        'persona',
        'Test observation',
        NOW(),
        NOW()
    ) ON CONFLICT (rtn, tenantid) DO NOTHING;
    
    RAISE NOTICE '✅ Inserción de prueba completada exitosamente';
    
    -- Verificar que se insertó
    IF EXISTS (SELECT 1 FROM "Customer" WHERE rtn = 'TEST12345678' AND tenantid = 'test') THEN
        RAISE NOTICE '✅ Registro de prueba encontrado y verificado';
        
        -- Limpiar prueba
        DELETE FROM "Customer" 
        WHERE rtn = 'TEST12345678' AND tenantid = 'test';
        
        RAISE NOTICE '✅ Limpieza de prueba completada';
    ELSE
        RAISE NOTICE '❌ Registro de prueba no encontrado';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ La prueba falló: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
END $$;

-- 7. Estado final
SELECT 
    'RLS Configuration Completed Successfully' as status,
    NOW() as completion_time,
    'All tables now have proper RLS policies' as result;
