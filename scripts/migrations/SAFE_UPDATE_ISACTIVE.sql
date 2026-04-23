-- =====================================================
-- ACTUALIZACIÓN SEGURA DE COLUMNA isActive
-- =====================================================

-- Paso 1: Verificar qué columnas existen realmente
SELECT column_name, table_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product'
ORDER BY column_name;

-- Paso 2: Verificar específicamente la columna activa
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name ILIKE '%active%'
ORDER BY column_name;

-- Paso 3: Renombrar si es necesario (solo si existe isactive)
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

-- Paso 4: Verificar después del renombrado
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name ILIKE '%active%'
ORDER BY column_name;

-- Paso 5: Actualizar solo si la columna existe con el nombre correcto
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Product' 
        AND column_name = 'isActive'
    ) THEN
        UPDATE "Product" SET isActive = true WHERE isActive IS NULL;
        RAISE NOTICE 'Productos actualizados con isActive = true';
    END IF;
END $$;

-- Paso 6: Verificación final
SELECT 
    'Proceso completado exitosamente' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM "Product") as products_count,
    (SELECT COUNT(*) FROM "Product" WHERE "isActive" = true) as active_products_count,
    (SELECT COUNT(*) FROM "Product" WHERE "isActive" IS NULL) as null_isactive_count;
