-- =====================================================
-- SCRIPT SQL CON SINTAXIS CORREGIDA
-- =====================================================

-- Verificar qué columnas existen realmente
SELECT column_name, table_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product'
ORDER BY column_name;

-- Verificar específicamente la columna activa
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name ILIKE '%active%'
ORDER BY column_name;

-- Renombrar si es necesario (solo si existe isactive)
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

-- Verificar después del renombrado
SELECT column_name, table_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Product' 
AND column_name ILIKE '%active%'
ORDER BY column_name;

-- Método alternativo: Usar CASE WHEN para actualizar
DO $$
BEGIN
    -- Primero intentar actualizar si la columna existe
    BEGIN
        UPDATE "Product" SET isActive = true WHERE "isActive" IS NULL;
        RAISE NOTICE 'UPDATE ejecutado con éxito';
    EXCEPTION WHEN undefined_column THEN
        -- Si la columna no existe, agregarla
        ALTER TABLE "Product" ADD COLUMN isActive BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'Columna isActive agregada';
    END;
END $$;

-- Verificación final
SELECT 
    'Proceso completado exitosamente' as status,
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
