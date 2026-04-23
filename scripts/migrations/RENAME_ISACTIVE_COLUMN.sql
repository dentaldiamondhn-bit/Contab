-- =====================================================
-- RENOMBRAR COLUMNA isactive A isActive
-- =====================================================

-- Verificar nombres actuales de columnas
SELECT column_name, table_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND (column_name = 'isactive' OR column_name = 'isActive')
ORDER BY column_name;

-- Renombrar columna isactive a isActive
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Product' 
        AND column_name = 'isactive'
    ) THEN
        ALTER TABLE "Product" RENAME COLUMN "isactive" TO "isActive";
        RAISE NOTICE 'Columna isactive renombrada a isActive';
    END IF;
END $$;

-- Verificar que la columna se haya renombrado
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name = 'isActive';

-- Actualizar todos los productos para que tengan isActive = true
UPDATE "Product" SET isActive = true WHERE isActive IS NULL;

-- Verificación final
SELECT 
    'Columna isActive renombrada exitosamente' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM "Product") as products_count,
    (SELECT COUNT(*) FROM "Product" WHERE isActive = true) as active_products_count;

-- Verificar estructura completa de la tabla Product
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
