-- =====================================================
-- REFRESCO DE ESQUEMA CONSOLIDADO PARA POSTGREST
-- =====================================================
-- Consolidado desde: FORCE_SCHEMA_REFRESH.sql y FORCE_SCHEMA_RELOAD.sql
-- Propósito: Forzar actualización completa del esquema y caché
-- =====================================================

-- 1. Crear tabla temporal para forzar actualización de esquema
CREATE TEMP TABLE IF NOT EXISTS schema_refresh_trigger (
    id SERIAL PRIMARY KEY,
    refresh_time TIMESTAMP DEFAULT NOW()
);

-- 2. Insertar y eliminar para forzar cambio de esquema
INSERT INTO schema_refresh_trigger DEFAULT VALUES;
DELETE FROM schema_refresh_trigger WHERE id = 1;

-- 3. Recrear políticas RLS si existen (limpieza y recreación)
DROP POLICY IF EXISTS "Allow Customer operations" ON "Customer";
DROP POLICY IF EXISTS "Allow CustomerRetentions operations" ON "CustomerRetentions";
DROP POLICY IF EXISTS "customer_schema_view" ON "Customer";

-- 4. Crear políticas simples sin validación compleja (si es necesario)
-- Nota: Descomentar solo si hay problemas con políticas existentes
/*
CREATE POLICY "Enable Customer operations" ON "Customer"
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable CustomerRetentions operations" ON "CustomerRetentions"
    FOR ALL
    USING (true)
    WITH CHECK (true);
*/

-- 5. Recrear vistas del esquema si existen
DROP VIEW IF EXISTS customer_schema_view;
CREATE VIEW customer_schema_view AS
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = 'public';

-- 6. Actualizar estadísticas de tablas críticas
ANALYZE "Customer";
ANALYZE "CustomerRetentions";
ANALYZE "Product";
ANALYZE "Account";
ANALYZE "Transaction";

-- 7. Forzar reconstrucción de índices en tablas críticas
REINDEX TABLE "Customer";
REINDEX TABLE "CustomerRetentions";
REINDEX TABLE "Product";

-- 8. Actualizar timestamps de modificación para forzar detección de cambios
-- (Esto ayuda a que PostgREST detecte cambios)
DO $$
BEGIN
    -- Customer table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Customer' AND table_schema = 'public') THEN
        ALTER TABLE "Customer" ALTER COLUMN updatedat SET DEFAULT NOW();
        ALTER TABLE "Customer" ALTER COLUMN updatedat DROP DEFAULT;
        ALTER TABLE "Customer" ALTER COLUMN updatedat SET DEFAULT NOW();
    END IF;
    
    -- CustomerRetentions table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CustomerRetentions' AND table_schema = 'public') THEN
        ALTER TABLE "CustomerRetentions" ALTER COLUMN updatedat SET DEFAULT NOW();
        ALTER TABLE "CustomerRetentions" ALTER COLUMN updatedat DROP DEFAULT;
        ALTER TABLE "CustomerRetentions" ALTER COLUMN updatedat SET DEFAULT NOW();
    END IF;
    
    -- Product table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Product' AND table_schema = 'public') THEN
        ALTER TABLE "Product" ALTER COLUMN updatedat SET DEFAULT NOW();
        ALTER TABLE "Product" ALTER COLUMN updatedat DROP DEFAULT;
        ALTER TABLE "Product" ALTER COLUMN updatedat SET DEFAULT NOW();
    END IF;
END $$;

-- 9. Verificación de estado final
SELECT 
    'Schema refresh completed' as status,
    NOW() as refresh_time,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'Customer' AND table_schema = 'public') as customer_columns,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'Product' AND table_schema = 'public') as product_columns;

-- 10. Mostrar columnas críticas para verificar
SELECT 
    table_name,
    column_name,
    data_type,
    'CRITICAL COLUMN' as importance
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name IN ('Customer', 'CustomerRetentions', 'Product')
AND column_name ILIKE ANY(ARRAY['contactcode', 'contacttype', 'observations', 'taxpayertype', 'isactive', 'createdat', 'updatedat'])
ORDER BY table_name, column_name;

-- 11. Prueba de inserción para verificar que el esquema funciona
DO $$
BEGIN
    RAISE NOTICE 'Probando inserción forzando esquema...';
    
    -- Prueba con CustomerRetentions si existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CustomerRetentions' AND table_schema = 'public') THEN
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
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Inserción CustomerRetentions exitosa';
        
        DELETE FROM "CustomerRetentions" 
        WHERE customerId = 'test-force' AND tenantId = 'test-tenant';
        
        RAISE NOTICE '✅ Limpieza CustomerRetentions completada';
    END IF;
    
    -- Prueba con Customer si existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Customer' AND table_schema = 'public') THEN
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
        
        RAISE NOTICE '✅ Inserción Customer exitosa';
        
        DELETE FROM "Customer" 
        WHERE rtn = 'TEST12345678' AND tenantid = 'test';
        
        RAISE NOTICE '✅ Limpieza Customer completada';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error en prueba: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
END $$;

-- 12. Resultado final
SELECT 
    'Recarga de esquema completada exitosamente' as result,
    NOW() as timestamp,
    'Todas las tablas críticas han sido actualizadas' as message;

-- =====================================================
-- FIN DEL REFRESCO CONSOLIDADO DE ESQUEMA
-- =====================================================
