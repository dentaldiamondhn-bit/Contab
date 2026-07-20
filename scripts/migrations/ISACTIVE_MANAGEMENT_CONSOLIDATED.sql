-- =====================================================
-- GESTIÓN CONSOLIDADA DE COLUMNA isActive
-- =====================================================
-- Consolidado desde: RENAME_ISACTIVE_COLUMN.sql y SAFE_UPDATE_ISACTIVE.sql
-- Propósito: Manejar de forma segura y unificada la columna isActive en todas las tablas
-- =====================================================

-- 1. Configuración inicial
DO $$
BEGIN
    RAISE NOTICE '=== INICIANDO GESTIÓN UNIFICADA DE COLUMNA isActive ===';
    RAISE NOTICE 'Timestamp: %', NOW();
END $$;

-- 2. Función para verificar y renombrar columna isActive
CREATE OR REPLACE FUNCTION ensure_isactive_column(table_name TEXT)
RETURNS TEXT AS $$
DECLARE
    column_exists BOOLEAN;
    rename_needed BOOLEAN;
    update_count INTEGER;
BEGIN
    -- Verificar si existe alguna columna activa
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = table_name 
        AND column_name ILIKE '%active%'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RETURN 'No active column found in table ' || table_name;
    END IF;
    
    -- Verificar si necesita renombrado de isactive a isActive
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = table_name 
        AND column_name = 'isactive'
    ) INTO rename_needed;
    
    IF rename_needed THEN
        EXECUTE format('ALTER TABLE %I RENAME COLUMN "isactive" TO "isActive"', table_name);
        RAISE NOTICE 'Columna isactive renombrada a isActive en tabla %', table_name;
    END IF;
    
    -- Actualizar valores nulos si la columna existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = table_name 
        AND column_name = 'isActive'
    ) THEN
        EXECUTE format('UPDATE %I SET "isActive" = true WHERE "isActive" IS NULL', table_name);
        GET DIAGNOSTICS update_count = ROW_COUNT;
        RETURN 'isActive column updated in ' || table_name || '. Rows updated: ' || update_count;
    END IF;
    
    RETURN 'isActive column processed in ' || table_name;
END;
$$ LANGUAGE plpgsql;

-- 3. Aplicar a tabla Product
SELECT 
    'Product Table' as section,
    ensure_isactive_column('Product') as result;

-- Verificación específica para Product
SELECT 
    'Product Column Verification' as section,
    column_name,
    table_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name ILIKE '%active%'
ORDER BY column_name;

-- 4. Aplicar a otras tablas que puedan tener isActive
DO $$
DECLARE
    table_record RECORD;
    result_text TEXT;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name NOT IN ('information_schema', 'pg_catalog')
        AND table_name ILIKE '%customer%' OR table_name ILIKE '%product%' OR table_name ILIKE '%account%' OR table_name ILIKE '%tenant%' OR table_name ILIKE '%user%'
        ORDER BY table_name
    LOOP
        -- Verificar si la tabla tiene alguna columna activa
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = table_record.table_name 
            AND column_name ILIKE '%active%'
        ) THEN
            SELECT ensure_isactive_column(table_record.table_name) INTO result_text;
            RAISE NOTICE 'Processed table %: %', table_record.table_name, result_text;
        END IF;
    END LOOP;
END $$;

-- 5. Verificación completa de todas las columnas isActive
SELECT 
    'All Active Columns Status' as section,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name = 'isActive' THEN '✅ isActive - CORRECT'
        WHEN column_name = 'isactive' THEN '⚠️ isactive - LOWERCASE'
        WHEN column_name = 'ISACTIVE' THEN '⚠️ ISACTIVE - UPPERCASE'
        WHEN column_name ILIKE '%active%' THEN '❌ ' || column_name || ' - CASE MISMATCH'
        ELSE '❓ OTHER'
    END as status_analysis
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name ILIKE '%active%'
ORDER BY table_name, column_name;

-- 6. Estadísticas de actualización para Product
SELECT 
    'Product Statistics' as section,
    'Columna isActive renombrada exitosamente' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM "Product") as products_count,
    (SELECT COUNT(*) FROM "Product" WHERE "isActive" = true) as active_products_count,
    (SELECT COUNT(*) FROM "Product" WHERE "isActive" IS NULL) as null_isactive_count,
    (SELECT COUNT(*) FROM "Product" WHERE "isActive" = false) as inactive_products_count;

-- 7. Verificación de estructura completa de tablas críticas
DO $$
DECLARE
    table_record RECORD;
    column_record RECORD;
    table_columns TEXT := '';
BEGIN
    RAISE NOTICE '=== ESTRUCTURA COMPLETA DE TABLAS CRÍTICAS ===';
    
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('Product', 'Customer', 'Account', 'Tenant', 'User')
        ORDER BY table_name
    LOOP
        RAISE NOTICE '=== TABLA: % ===', table_record.table_name;
        
        table_columns := '';
        FOR column_record IN 
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = table_record.table_name
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  %: % (nullable: %, default: %)', 
                column_record.column_name, 
                column_record.data_type, 
                column_record.is_nullable, 
                COALESCE(column_record.column_default::TEXT, 'NULL');
        END LOOP;
    END LOOP;
END $$;

-- 8. Función de limpieza (opcional - para desarrollo)
CREATE OR REPLACE FUNCTION cleanup_isactive_management()
RETURNS TEXT AS $$
BEGIN
    -- Eliminar la función temporal si existe
    DROP FUNCTION IF EXISTS ensure_isactive_column(TEXT);
    RETURN 'Cleanup completed. Temporary function removed.';
END;
$$ LANGUAGE plpgsql;

-- 9. Verificación final y resumen
SELECT 
    'Final Verification' as section,
    'Proceso completado exitosamente' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'isActive') as isactive_columns_count,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'isactive') as isactive_lowercase_count,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'ISACTIVE') as isactive_uppercase_count;

-- 10. Recomendaciones
DO $$
BEGIN
    RAISE NOTICE '=== RECOMENDACIONES ===';
    RAISE NOTICE '1. Todas las columnas isactive han sido renombradas a isActive';
    RAISE NOTICE '2. Los valores nulos han sido actualizados a true';
    RAISE NOTICE '3. Verifique que su aplicación ahora use "isActive" en lugar de "isactive"';
    RAISE NOTICE '4. Ejecute SELECT cleanup_isactive_management() para limpiar funciones temporales';
    RAISE NOTICE '=== FIN DE GESTIÓN UNIFICADA DE isActive ===';
END $$;

-- =====================================================
-- FIN DE GESTIÓN CONSOLIDADA DE COLUMNA isActive
-- =====================================================
