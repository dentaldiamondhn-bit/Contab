-- =====================================================
-- CORRECCIÓN DE NOMBRES DE TABLAS Y COLUMNAS
-- =====================================================

-- Verificar nombres actuales de tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%product%' OR table_name LIKE '%movement%';

-- Verificar nombres actuales de columnas
SELECT column_name, table_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name LIKE '%product%' 
AND column_name LIKE '%active%';

-- Si las tablas se crearon en minúsculas, renombrarlas
DO $$
BEGIN
    -- Renombrar tabla InventoryMovement si existe en minúsculas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_movement') THEN
        ALTER TABLE "inventory_movement" RENAME TO "InventoryMovement";
        RAISE NOTICE 'Tabla inventory_movement renombrada a InventoryMovement';
    END IF;
    
    -- Renombrar tabla Product si existe en minúsculas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product') THEN
        ALTER TABLE "product" RENAME TO "Product";
        RAISE NOTICE 'Tabla product renombrada a Product';
    END IF;
END $$;

-- Corregir nombres de columnas si es necesario
DO $$
BEGIN
    -- Corregir columna isActive si existe como isactive
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Product' 
        AND column_name = 'isactive'
    ) THEN
        ALTER TABLE "Product" RENAME COLUMN "isactive" TO "isActive";
        RAISE NOTICE 'Columna isactive renombrada a isActive';
    END IF;
    
    -- Corregir columna createdat si existe como created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Product' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE "Product" RENAME COLUMN "created_at" TO "createdat";
        RAISE NOTICE 'Columna created_at renombrada a createdat';
    END IF;
    
    -- Corregir columna updatedat si existe como updated_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Product' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE "Product" RENAME COLUMN "updated_at" TO "updatedat";
        RAISE NOTICE 'Columna updated_at renombrada a updatedat';
    END IF;
    
    -- Corregir columna createdat en InventoryMovement si existe como created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'InventoryMovement' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE "InventoryMovement" RENAME COLUMN "created_at" TO "createdat";
        RAISE NOTICE 'Columna created_at renombrada a createdat en InventoryMovement';
    END IF;
END $$;

-- Verificar que las tablas y columnas estén correctas
SELECT 
    'Tablas corregidas exitosamente' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM "Product") as products_count,
    (SELECT COUNT(*) FROM "InventoryMovement") as movements_count;

-- Verificar estructura final
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('Product', 'InventoryMovement')
ORDER BY table_name, ordinal_position;
