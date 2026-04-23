-- =====================================================
-- VERIFICAR Y CREAR COLUMNA maxStock
-- =====================================================

-- Paso 1: Verificar qué columnas existen realmente en la tabla Product
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product'
ORDER BY column_name;

-- Paso 2: Verificar específicamente si existe maxStock
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name ILIKE '%maxstock%'
ORDER BY column_name;

-- Paso 3: Agregar columna maxStock si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Product' 
        AND column_name = 'maxStock'
    ) THEN
        ALTER TABLE "Product" ADD COLUMN maxStock INTEGER NOT NULL DEFAULT 100;
        RAISE NOTICE 'Columna maxStock agregada';
    END IF;
END $$;

-- Paso 4: Verificar después de la creación
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name ILIKE '%maxstock%'
ORDER BY column_name;

-- Paso 5: Actualizar valores existentes si es necesario
UPDATE "Product" 
SET maxStock = 100 
WHERE maxStock IS NULL OR maxStock = 0;

-- Paso 6: Verificación final
SELECT 
    'Proceso completado exitosamente' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM "Product") as products_count,
    (SELECT COUNT(*) FROM "Product" WHERE maxStock IS NOT NULL) as maxstock_count,
    (SELECT COUNT(*) FROM "Product" WHERE maxStock = 100) as default_maxstock_count;

-- Verificar estructura final de la tabla Product
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product'
ORDER BY ordinal_position;
