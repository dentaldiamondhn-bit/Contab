-- =====================================================
-- VERIFICAR Y CORREGIR COLUMNA updatedAt EN TAXES
-- =====================================================

-- Paso 1: Verificar columnas actuales de Taxes
SELECT 
    '=== ESTRUCTURA ACTUAL Taxes ===' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Taxes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Paso 2: Verificar columnas con nombres similares
SELECT 
    '=== COLUMNAS SIMILARES A updatedAt ===' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Taxes' 
AND table_schema = 'public'
AND (column_name ILIKE '%updated%' OR column_name ILIKE '%date%')
ORDER BY column_name;

-- Paso 3: Verificar datos de ejemplo para ver los nombres reales
SELECT 
    '=== DATOS DE EJEMPLO CON FECHAS ===' as info,
    id,
    name,
    tenantid,
    isactive,
    createdat,
    updatedat,
    createdat as "created_at",
    updatedat as "updated_at"
FROM "Taxes" 
WHERE tenantid IS NOT NULL
LIMIT 3;
