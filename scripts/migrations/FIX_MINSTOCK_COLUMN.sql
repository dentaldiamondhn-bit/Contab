-- =====================================================
-- VERIFICAR Y CREAR COLUMNA minStock
-- =====================================================

-- Paso 1: Verificar qué columnas existen realmente en la tabla Product
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product'
ORDER BY column_name;

-- Paso 2: Verificar específicamente si existe minStock
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name ILIKE '%minstock%'
ORDER BY column_name;

-- Paso 3: Agregar columna minStock si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Product' 
        AND column_name = 'minStock'
    ) THEN
        ALTER TABLE "Product" ADD COLUMN minStock INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Columna minStock agregada';
    END IF;
END $$;

-- Paso 4: Verificar después de la creación
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name ILIKE '%minstock%'
ORDER BY column_name;

-- Paso 5: Actualizar valores existentes si es necesario
UPDATE "Product" 
SET minStock = 0 
WHERE minStock IS NULL;

-- Paso 6: Verificación final
SELECT 
    'Proceso completado exitosamente' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM "Product") as products_count,
    (SELECT COUNT(*) FROM "Product" WHERE minStock IS NOT NULL) as minstock_count,
    (SELECT COUNT(*) FROM "Product" WHERE minStock = 0) as default_minstock_count;

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
