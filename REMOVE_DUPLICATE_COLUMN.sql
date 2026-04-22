-- =====================================================
-- ELIMINAR COLUMNA DUPLICADA isactive
-- =====================================================

-- Verificar columnas duplicadas
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND (column_name = 'isActive' OR column_name = 'isactive')
ORDER BY column_name;

-- Eliminar la columna duplicada isactive (minúsculas)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Product' 
        AND column_name = 'isactive'
    ) THEN
        ALTER TABLE "Product" DROP COLUMN "isactive";
        RAISE NOTICE 'Columna duplicada isactive eliminada';
    END IF;
END $$;

-- Verificar que solo quede la columna correcta
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name ILIKE '%active%'
ORDER BY column_name;

-- Actualizar todos los productos para que tengan isActive = true
UPDATE "Product" SET "isActive" = true WHERE "isActive" IS NULL;

-- Verificación final
SELECT 
    'Columna duplicada eliminada exitosamente' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM "Product") as products_count,
    (SELECT COUNT(*) FROM "Product" WHERE "isActive" = true) as active_products_count,
    (SELECT COUNT(*) FROM "Product" WHERE "isActive" IS NULL) as null_isactive_count;

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
