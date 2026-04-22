-- =====================================================
-- ACTUALIZAR STOCK BASADO EN MOVIMIENTOS
-- =====================================================

-- Paso 1: Verificar stock actual vs stock calculado
SELECT 
    p.id,
    p.name,
    p.stock as stock_bd,
    (SELECT COALESCE(SUM(CASE WHEN m.type = 'IN' THEN m.quantity WHEN m.type = 'OUT' THEN -m.quantity ELSE 0 END)::integer, 0)
     FROM "InventoryMovement" m 
     WHERE m.productid = p.id) as stock_calculado
FROM "Product" p
WHERE p.tenantid = '1'
ORDER BY p.name;

-- Paso 2: Actualizar stock para que coincida con los movimientos
UPDATE "Product" 
SET stock = (
    SELECT COALESCE(SUM(CASE WHEN m.type = 'IN' THEN m.quantity WHEN m.type = 'OUT' THEN -m.quantity ELSE 0 END)::integer, 0)
    FROM "InventoryMovement" m 
    WHERE m.productid = "Product".id
)
WHERE tenantid = '1' AND id IN (
    SELECT DISTINCT productid 
    FROM "InventoryMovement" 
    WHERE tenantid = '1'
);

-- Paso 3: Verificación final
SELECT 
    p.id,
    p.name,
    p.stock as stock_actualizado,
    (SELECT COALESCE(SUM(CASE WHEN m.type = 'IN' THEN m.quantity WHEN m.type = 'OUT' THEN -m.quantity ELSE 0 END)::integer, 0)
     FROM "InventoryMovement" m 
     WHERE m.productid = p.id) as stock_calculado,
    CASE 
        WHEN (SELECT COALESCE(SUM(CASE WHEN m.type = 'IN' THEN m.quantity WHEN m.type = 'OUT' THEN -m.quantity ELSE 0 END)::integer, 0)
             FROM "InventoryMovement" m 
             WHERE m.productid = p.id) = 0 THEN 'Agotado'
        WHEN (SELECT COALESCE(SUM(CASE WHEN m.type = 'IN' THEN m.quantity WHEN m.type = 'OUT' THEN -m.quantity ELSE 0 END)::integer, 0)
             FROM "InventoryMovement" m 
             WHERE m.productid = p.id) <= p.minstock THEN 'Bajo'
        ELSE 'Normal'
    END as estado
FROM "Product" p
WHERE p.tenantid = '1'
ORDER BY p.name;
