-- =====================================================
-- POLITICA RLS PERMISIVA PARA DESARROLLO
-- =====================================================

-- ESTE SCRIPT ES SOLO PARA DESARROLLO LOCAL
-- Elimina todas las restricciones RLS y permite todas las operaciones

-- 1. Deshabilitar RLS temporalmente en todas las tablas relacionadas
ALTER TABLE "CustomerRetentions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerTaxes" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerFiles" DISABLE ROW LEVEL SECURITY;

-- 2. Verificar estado
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('Customer', 'CustomerRetentions', 'CustomerTaxes', 'CustomerFiles')
AND schemaname = 'public';

-- 3. Probar inserción en CustomerRetentions
DO $$
BEGIN
    RAISE NOTICE 'Probando inserción sin RLS...';
    
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
        'test-dev',
        'dev-tenant',
        '2102-02',
        15.00,
        'Test sin RLS',
        true,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Inserción exitosa';
    
    DELETE FROM "CustomerRetentions" 
    WHERE customerId = 'test-dev' AND tenantId = 'dev-tenant';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
END $$;

-- 4. Resultado
SELECT 
    'RLS deshabilitado temporalmente' as status,
    'Todas las operaciones permitidas' as result,
    NOW() as timestamp;

-- NOTA: Para producción, habilitar RLS nuevamente con:
-- ALTER TABLE "CustomerRetentions" ENABLE ROW LEVEL SECURITY;
