-- =====================================================
-- CORREGIR POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- 1. Verificar políticas actuales
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'Customer';

-- 2. Eliminar políticas existentes que puedan causar problemas
DROP POLICY IF EXISTS "Tenant isolation" ON "Customer";
DROP POLICY IF EXISTS "Enable insert for all users" ON "Customer";
DROP POLICY IF EXISTS "Enable read for all users" ON "Customer";
DROP POLICY IF EXISTS "Enable update for all users" ON "Customer";

-- 3. Crear políticas RLS correctas y simples
-- Política para permitir todas las operaciones a usuarios autenticados
CREATE POLICY "Enable all for authenticated users" ON "Customer"
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Política alternativa basada en tenant (si necesitas aislamiento por tenant)
CREATE POLICY "Enable all with tenant check" ON "Customer"
    FOR ALL
    USING (
        auth.role() = 'authenticated' AND 
        (tenantid IS NULL OR tenantid = current_setting('app.current_tenant_id', true))
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        (tenantid IS NULL OR tenantid = current_setting('app.current_tenant_id', true))
    );

-- 4. Verificar que RLS esté habilitado
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;

-- 5. Hacer lo mismo para CustomerRetentions
DROP POLICY IF EXISTS "Tenant isolation customer retentions" ON "CustomerRetentions";
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "CustomerRetentions";

CREATE POLICY "Enable all for authenticated users retentions" ON "CustomerRetentions"
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE "CustomerRetentions" ENABLE ROW LEVEL SECURITY;

-- 6. Hacer lo mismo para CustomerFiles
DROP POLICY IF EXISTS "Tenant isolation customer files" ON "CustomerFiles";
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "CustomerFiles";

CREATE POLICY "Enable all for authenticated users files" ON "CustomerFiles"
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE "CustomerFiles" ENABLE ROW LEVEL SECURITY;

-- 7. Verificar configuración final
SELECT 
    'RLS Policies Updated' as status,
    NOW() as updated_at;

-- 8. Mostrar políticas finales
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'HAS QUAL'
        ELSE 'NO QUAL'
    END as has_qualification
FROM pg_policies 
WHERE tablename IN ('Customer', 'CustomerRetentions', 'CustomerFiles')
ORDER BY tablename, policyname;

-- 9. Probar inserción simple
-- (Esto debe funcionar después de las políticas)
DO $$
BEGIN
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
    
    RAISE NOTICE 'Test insertion completed successfully';
    
    -- Limpiar prueba
    DELETE FROM "Customer" 
    WHERE rtn = 'TEST12345678' AND tenantid = 'test';
    
    RAISE NOTICE 'Test cleanup completed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test failed: %', SQLERRM;
END $$;
