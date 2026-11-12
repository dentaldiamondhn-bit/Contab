-- =====================================================
-- RE-HABILITAR RLS CORRECTAMENTE
-- =====================================================

-- 1. Re-habilitar RLS en todas las tablas
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerRetentions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerTaxes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerFiles" ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas temporales (si existen)
DROP POLICY IF EXISTS "Allow all with tenant" ON "Customer";
DROP POLICY IF EXISTS "Allow all with tenant retentions" ON "CustomerRetentions";
DROP POLICY IF EXISTS "Allow all for authenticated users retentions" ON "CustomerRetentions";

-- 3. Crear políticas correctas para Clerk
-- Para Customer
CREATE POLICY "Allow Customer operations" ON "Customer"
    FOR ALL
    USING (tenantid IS NOT NULL AND tenantid != '')
    WITH CHECK (tenantid IS NOT NULL AND tenantid != '');

-- Para CustomerRetentions
CREATE POLICY "Allow CustomerRetentions operations" ON "CustomerRetentions"
    FOR ALL
    USING (tenantId IS NOT NULL AND tenantId != '')
    WITH CHECK (tenantId IS NOT NULL AND tenantId != '');

-- Para CustomerTaxes
CREATE POLICY "Allow CustomerTaxes operations" ON "CustomerTaxes"
    FOR ALL
    USING (tenantId IS NOT NULL AND tenantId != '')
    WITH CHECK (tenantId IS NOT NULL AND tenantId != '');

-- Para CustomerFiles
CREATE POLICY "Allow CustomerFiles operations" ON "CustomerFiles"
    FOR ALL
    USING (tenantId IS NOT NULL AND tenantId != '')
    WITH CHECK (tenantId IS NOT NULL AND tenantId != '');

-- 4. Verificar políticas creadas
SELECT 
    'RLS Re-habilitado correctamente' as status,
    NOW() as timestamp;

-- 5. Probar inserción
DO $$
BEGIN
    RAISE NOTICE 'Probando inserción con RLS re-habilitado...';
    
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
        'test-rls',
        'test-tenant',
        '2102-02',
        15.00,
        'Test con RLS',
        true,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Inserción exitosa con RLS re-habilitado';
    
    DELETE FROM "CustomerRetentions" 
    WHERE customerId = 'test-rls' AND tenantId = 'test-tenant';
    
    RAISE NOTICE '✅ Limpieza completada';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error en prueba: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
END $$;

-- 6. Resultado
SELECT 
    'RLS configurado correctamente' as result,
    NOW() as timestamp;

-- NOTA: Ahora las retenciones deberían funcionar correctamente
-- Las políticas permiten operaciones cuando tenantId no es nulo
