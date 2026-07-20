-- =====================================================
-- VERIFICACIÓN COMPREHENSIVA DE COLUMNAS CONSOLIDADA
-- =====================================================
-- Consolidado desde: VERIFY_COLUMNS.sql, VERIFY_COLUMN_NAMES.sql, VERIFY_MOVEMENT_COLUMNS.sql
-- Propósito: Verificar todas las columnas críticas del sistema en un solo script
-- =====================================================

-- 1. Configuración de parámetros
DO $$
BEGIN
    RAISE NOTICE '=== INICIANDO VERIFICACIÓN COMPREHENSIVA DE COLUMNAS ===';
    RAISE NOTICE 'Timestamp: %', NOW();
END $$;

-- 2. Verificación de tabla Product
SELECT 
    'Product' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position,
    CASE 
        WHEN column_name ILIKE '%stock%' OR column_name ILIKE '%min%' THEN '⚠️ STOCK RELATED'
        WHEN column_name ILIKE '%active%' THEN '🔧 ACTIVE STATUS'
        WHEN column_name ILIKE '%price%' OR column_name ILIKE '%cost%' THEN '💰 FINANCIAL'
        ELSE '📋 STANDARD'
    END as column_category
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product'
ORDER BY ordinal_position;

-- 3. Verificación específica de columnas de stock en Product
SELECT 
    'Product Stock Columns' as section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name = 'stock' THEN '✅ stock - EXACT MATCH'
        WHEN column_name = 'minStock' THEN '✅ minStock - EXACT MATCH'
        WHEN column_name = 'stock' THEN '✅ stock - EXACT MATCH'
        WHEN column_name ILIKE '%stock%' THEN '⚠️ ' || column_name || ' - CASE VARIATION'
        ELSE '❓ OTHER'
    END as status_analysis
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND (column_name ILIKE '%stock%' OR column_name ILIKE '%min%')
ORDER BY column_name;

-- 4. Verificación de tabla Customer
SELECT 
    'Customer' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    ordinal_position,
    CASE 
        WHEN column_name = 'contactCode' THEN '✅ contactCode - EXACT MATCH'
        WHEN column_name = 'contactcode' THEN '⚠️ contactcode - LOWERCASE'
        WHEN column_name = 'CONTACTCODE' THEN '⚠️ CONTACTCODE - UPPERCASE'
        WHEN column_name ILIKE 'contactcode' THEN '❌ contactCode - CASE MISMATCH'
        ELSE '📋 STANDARD'
    END as status_analysis
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Verificación específica de columnas críticas en Customer
SELECT 
    'Customer Critical Columns' as section,
    column_name,
    CASE 
        WHEN column_name = 'contactCode' THEN '✅ contactCode - EXACT MATCH'
        WHEN column_name = 'contactcode' THEN '⚠️ contactcode - LOWERCASE'
        WHEN column_name = 'CONTACTCODE' THEN '⚠️ CONTACTCODE - UPPERCASE'
        WHEN column_name ILIKE 'contactcode' THEN '❌ contactCode - CASE MISMATCH'
        ELSE '❓ OTHER'
    END as status_analysis
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = 'public'
AND column_name ILIKE 'contactcode'
ORDER BY column_name;

-- 6. Verificación de diferencias de mayúsculas/minúsculas en Product
SELECT 
    'Product Column Case Analysis' as section,
    column_name,
    LOWER(column_name) as column_name_lower,
    UPPER(column_name) as column_name_upper,
    data_type,
    CASE 
        WHEN column_name = LOWER(column_name) THEN '🔤 LOWERCASE'
        WHEN column_name = UPPER(column_name) THEN '🔠 UPPERCASE'
        WHEN column_name = INITCAP(column_name) THEN '🔤 Title Case'
        ELSE '🔄 MIXED CASE'
    END as case_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name ILIKE '%stock%'
ORDER BY column_name;

-- 7. Verificación de tablas de movimientos (si existen)
SELECT 
    'Movement Tables' as section,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name ILIKE '%movement%'
ORDER BY table_name, ordinal_position;

-- 8. Prueba de inserción para Customer
DO $$
BEGIN
    RAISE NOTICE '=== PROBANDO INSERCIÓN EN CUSTOMER ===';
    
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
    
    -- Verificar que la inserción funcionó
    SELECT 
        id,
        tenantid,
        rtn,
        name,
        "contactCode",
        contactType,
        observations,
        createdat
    INTO customer_test_data
    FROM "Customer" 
    WHERE rtn = 'TEST12345678' AND tenantid = 'test';
    
    IF FOUND THEN
        RAISE NOTICE '✅ Verificación de datos Customer exitosa';
    ELSE
        RAISE NOTICE '❌ Error: Datos Customer no encontrados';
    END IF;
    
    -- Limpiar datos de prueba
    DELETE FROM "Customer" 
    WHERE rtn = 'TEST12345678' AND tenantid = 'test';
    
    RAISE NOTICE '✅ Limpieza Customer completada';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error en prueba Customer: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
END $$;

-- 9. Verificación de columnas isActive en todas las tablas
SELECT 
    'Active Status Columns' as section,
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

-- 10. Resumen de todas las tablas y sus columnas
SELECT 
    'All Tables Summary' as section,
    table_name,
    COUNT(*) as column_count,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as all_columns
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name IN ('Customer', 'Product', 'Account', 'Transaction', 'Tenant', 'User')
GROUP BY table_name
ORDER BY table_name;

-- 11. Verificación de columnas de timestamp
SELECT 
    'Timestamp Columns' as section,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name ILIKE '%created%' THEN '🕐 CREATION'
        WHEN column_name ILIKE '%updated%' THEN '🕑 UPDATE'
        WHEN column_name ILIKE '%date%' OR column_name ILIKE '%time%' THEN '📅 DATETIME'
        ELSE '❓ OTHER'
    END as timestamp_type
FROM information_schema.columns 
WHERE table_schema = 'public'
AND (column_name ILIKE '%created%' OR column_name ILIKE '%updated%' OR column_name ILIKE '%date%' OR column_name ILIKE '%time%')
ORDER BY table_name, column_name;

-- 12. Estado final de la verificación
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICACIÓN COMPLETADA ===';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE 'Revise los resultados arriba para identificar problemas de columnas';
END $$;

SELECT 
    'Column verification completed' as status,
    NOW() as completion_time,
    'Revisa las secciones anteriores para detalles específicos' as message;

-- =====================================================
-- FIN DE VERIFICACIÓN COMPREHENSIVA DE COLUMNAS
-- =====================================================
