-- =====================================================
-- VERIFICAR Y CORREGIR COLUMNAS DE TAXES Y RETENTIONS
-- =====================================================

-- Paso 1: Verificar columnas de Taxes
SELECT 
    '=== ESTRUCTURA ACTUAL Taxes ===' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Taxes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Paso 2: Verificar columnas de Retentions
SELECT 
    '=== ESTRUCTURA ACTUAL Retentions ===' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Retentions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Paso 3: Agregar columna createdAt si no existe en Taxes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Taxes' 
        AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE "Taxes" ADD COLUMN "createdAt" TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Columna createdAt agregada a Taxes';
    END IF;
END $$;

-- Paso 4: Agregar columna createdAt si no existe en Retentions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Retentions' 
        AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE "Retentions" ADD COLUMN "createdAt" TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Columna createdAt agregada a Retentions';
    END IF;
END $$;

-- Paso 5: Verificación final
SELECT 
    '=== VERIFICACIÓN FINAL Taxes ===' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Taxes' 
AND table_schema = 'public'
AND column_name IN ('createdAt', 'createdat')
ORDER BY column_name;

SELECT 
    '=== VERIFICACIÓN FINAL Retentions ===' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Retentions' 
AND table_schema = 'public'
AND column_name IN ('createdAt', 'createdat')
ORDER BY column_name;
