-- =====================================================
-- VERIFICAR COLUMNAS DE INVENTORYMOVEMENT
-- =====================================================

-- Verificar todas las columnas de la tabla InventoryMovement
SELECT 
    column_name,
    table_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'InventoryMovement'
ORDER BY ordinal_position;

-- Verificar específicamente columnas relacionadas con producto
SELECT 
    column_name,
    table_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'InventoryMovement' 
AND (column_name ILIKE '%product%' OR column_name ILIKE '%id%')
ORDER BY column_name;

-- Verificar si hay movimientos existentes
SELECT 
    id,
    tenantid,
    productid,
    productId,
    type,
    quantity,
    reason,
    reference,
    createdat,
    createdby
FROM "InventoryMovement"
WHERE tenantid = '1'
ORDER BY createdat DESC
LIMIT 5;
