-- =====================================================
-- CORRECCIÓN RÁPIDA DE COLUMNA ISACTIVE
-- =====================================================

-- Verificar nombres actuales de columnas
SELECT column_name, table_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name LIKE '%active%'
ORDER BY column_name;

-- Corregir columna isActive si existe como isactive
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

-- Si la columna no existe, agregarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Product' 
        AND column_name = 'isActive'
    ) THEN
        ALTER TABLE "Product" ADD COLUMN isActive BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'Columna isActive agregada';
    END IF;
END $$;

-- Verificar estructura final
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name IN ('isActive', 'isactive')
ORDER BY column_name;

-- Actualizar datos si es necesario
UPDATE "Product" SET isActive = true WHERE isActive IS NULL;

-- Verificación final
SELECT 
    'Columna isActive corregida' as status,
    (SELECT COUNT(*) FROM "Product") as products_count,
    (SELECT COUNT(*) FROM "Product" WHERE isActive = true) as active_products_count;
