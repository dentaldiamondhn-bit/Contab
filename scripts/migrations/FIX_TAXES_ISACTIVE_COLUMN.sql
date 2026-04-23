-- =====================================================
-- VERIFICAR Y CORREGIR COLUMNA isActive EN TAXES
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

-- Paso 2: Agregar columna isActive si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Taxes' 
        AND column_name = 'isActive'
    ) THEN
        ALTER TABLE "Taxes" ADD COLUMN "isActive" BOOLEAN DEFAULT true;
        RAISE NOTICE 'Columna isActive agregada a Taxes';
    END IF;
END $$;

-- Paso 3: Verificar si hay una columna similar con diferente nombre
SELECT 
    '=== COLUMNAS SIMILARES EN Taxes ===' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Taxes' 
AND table_schema = 'public'
AND (column_name ILIKE '%active%' OR column_name ILIKE '%status%')
ORDER BY column_name;

-- Paso 4: Actualizar valores nulos si es necesario
UPDATE "Taxes" 
SET "isActive" = true 
WHERE "isActive" IS NULL;

-- Paso 5: Verificación final
SELECT 
    '=== VERIFICACIÓN FINAL Taxes ===' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Taxes' 
AND table_schema = 'public'
AND column_name = 'isActive';

-- Paso 6: Verificar datos de ejemplo
SELECT 
    '=== DATOS DE EJEMPLO Taxes ===' as info,
    id,
    name,
    tenantId,
    isActive,
    createdat
FROM "Taxes" 
WHERE tenantid IS NOT NULL
LIMIT 3;
