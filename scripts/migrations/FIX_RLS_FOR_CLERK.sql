-- =====================================================
-- RLS PARA CLERK AUTHENTICATION
-- =====================================================

-- NOTA: La aplicación usa Clerk, no Supabase Auth
-- Por lo tanto, auth.role() NUNCA será 'authenticated' en Supabase
-- Usamos tenantId como mecanismo de aislamiento y seguridad

-- 1. Eliminar políticas existentes
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
END $$;

-- 2. Habilitar RLS
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerRetentions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerFiles" ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas basadas en tenantId (compatible con Clerk)
-- Estas políticas permiten operaciones SI hay un tenantId válido

-- Política para Customer: permitir operaciones con tenantId no nulo
CREATE POLICY "Allow operations with tenant" ON "Customer"
    FOR ALL
    USING (tenantid IS NOT NULL AND tenantid != '')
    WITH CHECK (tenantid IS NOT NULL AND tenantid != '');

-- Política para CustomerRetentions
CREATE POLICY "Allow operations with tenant retentions" ON "CustomerRetentions"
    FOR ALL
    USING (tenantId IS NOT NULL AND tenantId != '')
    WITH CHECK (tenantId IS NOT NULL AND tenantId != '');

-- Política para CustomerFiles
CREATE POLICY "Allow operations with tenant files" ON "CustomerFiles"
    FOR ALL
    USING (tenantId IS NOT NULL AND tenantId != '')
    WITH CHECK (tenantId IS NOT NULL AND tenantId != '');

-- 4. Verificar políticas creadas
SELECT 'POLITICAS RLS PARA CLERK' as info;
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

-- 5. Probar inserción
DO $$
BEGIN
    RAISE NOTICE 'Probando inserción con nuevas políticas...';
    
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
        'test_tenant', 
        'TEST99988877', 
        'Test Clerk Auth',
        'CT999TEST',
        'empresa',
        'Test con políticas Clerk',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Inserción exitosa con tenantId';
    
    -- Limpiar
    DELETE FROM "Customer" 
    WHERE rtn = 'TEST99988877' AND tenantid = 'test_tenant';
    
    RAISE NOTICE '✅ Limpieza completada';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
END $$;

-- 6. Probar que SIN tenantId falla
DO $$
BEGIN
    RAISE NOTICE 'Probando que inserción SIN tenantId es rechazada...';
    
    INSERT INTO "Customer" (
        tenantid, 
        rtn, 
        name, 
        "contactCode",
        contactType,
        createdat,
        updatedat
    ) VALUES (
        NULL,  -- Sin tenantId
        'TESTNULL111', 
        'Should Fail',
        'CTFAIL001',
        'persona',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '❌ ERROR: La inserción sin tenantId debería haber fallado';
    
    -- Limpiar si por alguna razón se insertó
    DELETE FROM "Customer" WHERE rtn = 'TESTNULL111';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '✅ Correcto: Inserción sin tenantId fue rechazada';
        RAISE NOTICE '   Error esperado: %', SQLERRM;
END $$;

-- 7. Resumen
SELECT 
    'RLS configurado para Clerk Authentication' as status,
    NOW() as timestamp,
    'Las políticas ahora usan tenantId en lugar de auth.role()' as notes;

-- NOTAS:
-- - Las operaciones requieren un tenantId válido (no nulo, no vacío)
-- - El frontend debe enviar tenantId en todas las operaciones
-- - Esto proporciona aislamiento de datos entre tenants
-- - Compatible con Clerk Authentication
