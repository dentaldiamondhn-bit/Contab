-- =====================================================
-- VERIFICAR Y AGREGAR COLUMNA ISACTIVE
-- =====================================================

-- Verificar TODAS las columnas de la tabla Product
SELECT column_name, table_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product'
ORDER BY column_name;

-- Verificar específicamente si existe alguna columna con 'active'
SELECT column_name, table_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND (column_name ILIKE '%active%' OR column_name ILIKE '%Active%')
ORDER BY column_name;

-- Agregar la columna isActive si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Product' 
        AND column_name = 'isActive'
    ) THEN
        ALTER TABLE "Product" ADD COLUMN isActive BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'Columna isActive agregada a la tabla Product';
    END IF;
END $$;

-- Verificar que la columna se haya agregado
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name = 'isActive';

-- Actualizar todos los productos para que tengan isActive = true
UPDATE "Product" SET isActive = true WHERE isActive IS NULL;

-- Verificación final
SELECT 
    'Columna isActive agregada exitosamente' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM "Product") as products_count,
    (SELECT COUNT(*) FROM "Product" WHERE isActive = true) as active_products_count;
