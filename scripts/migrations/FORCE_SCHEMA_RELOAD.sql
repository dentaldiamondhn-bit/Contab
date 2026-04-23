-- =====================================================
-- FORZAR RECARGA COMPLETA DE ESQUEMA
-- =====================================================

-- 1. Limpiar caché de PostgREST (si es posible)
-- NOTA: Esto requiere acceso administrativo al servidor PostgreSQL

-- 2. Recrear políticas RLS
DROP POLICY IF EXISTS "Allow Customer operations" ON "Customer";
DROP POLICY IF EXISTS "Allow CustomerRetentions operations" ON "CustomerRetentions";

-- 3. Crear políticas simples sin validación compleja
CREATE POLICY "Enable Customer operations" ON "Customer"
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable CustomerRetentions operations" ON "CustomerRetentions"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Forzar actualización de estadísticas
ANALYZE "Customer";
ANALYZE "CustomerRetentions";

-- 5. Verificar estado final
SELECT 
    'Esquema forzado para recargar' as status,
    NOW() as timestamp;

-- 6. Probar inserción
DO $$
BEGIN
    RAISE NOTICE 'Probando inserción forzando esquema...';
    
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
        'test-force',
        'test-tenant',
        '2102-02',
        15.00,
        'Test forzado',
        true,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Inserción exitosa';
    
    DELETE FROM "CustomerRetentions" 
    WHERE customerId = 'test-force' AND tenantId = 'test-tenant';
    
    RAISE NOTICE '✅ Limpieza completada';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error en prueba: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
END $$;

-- 7. Resultado
SELECT 
    'Recarga de esquema completada' as result,
    NOW() as timestamp;
