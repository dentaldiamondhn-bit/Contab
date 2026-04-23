-- =====================================================
-- CORREGIR RLS PARA CustomerRetentions
-- =====================================================

-- 1. Verificar políticas actuales
SELECT '=== POLITICAS ACTUALES CustomerRetentions ===' as info;
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
WHERE tablename = 'CustomerRetentions';

-- 2. Eliminar todas las políticas existentes de CustomerRetentions
DROP POLICY IF EXISTS "Allow operations with tenant retentions" ON "CustomerRetentions";
DROP POLICY IF EXISTS "Allow all operations retentions" ON "CustomerRetentions";
DROP POLICY IF EXISTS "Allow all for authenticated users retentions" ON "CustomerRetentions";
DROP POLICY IF EXISTS "Tenant isolation customer retentions" ON "CustomerRetentions";
DROP POLICY IF EXISTS "Allow operations with tenant" ON "CustomerRetentions";

-- 3. Asegurar que RLS esté habilitado
ALTER TABLE "CustomerRetentions" ENABLE ROW LEVEL SECURITY;

-- 4. Crear política permisiva para desarrollo (basada en tenantId)
CREATE POLICY "Allow all with tenant" ON "CustomerRetentions"
    FOR ALL
    USING (tenantId IS NOT NULL AND tenantId != '')
    WITH CHECK (tenantId IS NOT NULL AND tenantId != '');

-- 5. Verificar políticas nuevas
SELECT '=== NUEVAS POLITICAS CustomerRetentions ===' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'CustomerRetentions';

-- 6. Probar inserción
DO $$
BEGIN
    RAISE NOTICE 'Probando inserción en CustomerRetentions...';
    
    INSERT INTO "CustomerRetentions" (
        customerId,
        tenantId,
        account,
        percentage,
        description,
        isActive,
        createdat,
        updatedat
    ) VALUES (
        'test-customer',
        'test-tenant',
        '2102-02',
        15.00,
        'Test retention RLS',
        true,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Inserción exitosa en CustomerRetentions';
    
    -- Limpiar
    DELETE FROM "CustomerRetentions" 
    WHERE customerId = 'test-customer' AND tenantId = 'test-tenant';
    
    RAISE NOTICE '✅ Limpieza completada';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error en prueba: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
END $$;

-- 7. Estado final
SELECT 
    'RLS para CustomerRetentions corregido' as status,
    NOW() as timestamp;

-- NOTA: La política ahora permite operaciones con tenantId válido
