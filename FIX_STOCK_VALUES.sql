-- =====================================================
-- CORREGIR VALORES DE STOCK NEGATIVOS
-- =====================================================

-- Verificar estado actual del stock
SELECT 
    p.sku,
    p.name,
    p.stock as current_stock,
    p.minStock,
    p.maxStock,
    (SELECT COUNT(*) FROM "InventoryMovement" m WHERE m.productid = p.id) as movement_count,
    (SELECT SUM(CASE WHEN m.type = 'IN' THEN m.quantity ELSE -m.quantity END) 
     FROM "InventoryMovement" m WHERE m.productid = p.id) as net_movement
FROM "Product" p
ORDER BY p.sku;

-- Verificar movimientos existentes
SELECT 
    m.id,
    p.sku,
    p.name,
    m.type,
    m.quantity,
    m.reason,
    m.reference,
    m.createdat,
    p.stock as stock_after_movement
FROM "InventoryMovement" m
JOIN "Product" p ON m.productid = p.id
ORDER BY m.createdat;

-- Corregir valores de stock negativos
DO $$
BEGIN
    -- Actualizar stock a valores positivos si son negativos
    UPDATE "Product" 
    SET stock = CASE 
        WHEN stock < 0 THEN 0 
        ELSE stock 
    END,
    updatedat = NOW()
    WHERE stock < 0;
    
    RAISE NOTICE 'Stock negativos corregidos a 0';
END $$;

-- Limpiar movimientos que causaron stock negativo
DO $$
BEGIN
    -- Eliminar movimientos que harían el stock negativo
    DELETE FROM "InventoryMovement" 
    WHERE id IN (
        SELECT m.id
        FROM "InventoryMovement" m
        JOIN "Product" p ON m.productid = p.id
        WHERE m.type = 'OUT'
        AND p.stock < m.quantity
    );
    
    RAISE NOTICE 'Movimientos problemáticos eliminados';
END $$;

-- Restablecer valores de stock correctos basados en movimientos válidos
DO $$
BEGIN
    -- Para cada producto, calcular el stock correcto basado en movimientos válidos
    UPDATE "Product" p
    SET stock = COALESCE(
        (SELECT SUM(CASE WHEN m.type = 'IN' THEN m.quantity ELSE 0 END) 
         FROM "InventoryMovement" m 
         WHERE m.productid = p.id), 0
    ),
    updatedat = NOW()
    WHERE p.id IN (
        SELECT DISTINCT productid 
        FROM "InventoryMovement"
    );
    
    RAISE NOTICE 'Stock recalculado basado en movimientos válidos';
END $$;

-- Insertar datos de ejemplo correctos (sin movimientos problemáticos)
DELETE FROM "InventoryMovement" WHERE reference LIKE 'TEST-%';

INSERT INTO "Product" (tenantid, sku, name, description, category, unit, cost, price, stock, minStock, maxStock, isActive) VALUES
('1', 'PROD-001', 'Material de Empaque Pequeño', 'Cajas de cartón para empaque pequeño', 'Empaque', 'Cajas', 5.50, 8.00, 150, 20, 200, true),
('1', 'PROD-002', 'Material de Limpieza', 'Kit de limpieza para consultorio dental', 'Limpieza', 'Unidades', 25.00, 45.00, 8, 10, 50, true),
('1', 'PROD-003', 'Guantes Desechables', 'Guantes de látex tamaño M', 'Insumos Médicos', 'Cajas', 12.00, 18.00, 45, 15, 100, true)
ON CONFLICT (sku) DO UPDATE SET
    stock = EXCLUDED.stock,
    minStock = EXCLUDED.minStock,
    maxStock = EXCLUDED.maxStock,
    isActive = EXCLUDED.isActive;

-- Insertar movimientos de ejemplo seguros
INSERT INTO "InventoryMovement" (tenantid, productid, type, quantity, reason, reference, createdby)
SELECT '1', p.id, 'IN', 50, 'Compra inicial', 'FACT-001', 'admin'
FROM "Product" p WHERE p.sku = 'PROD-001'
ON CONFLICT DO NOTHING;

INSERT INTO "InventoryMovement" (tenantid, productid, type, quantity, reason, reference, createdby)
SELECT '1', p.id, 'IN', 30, 'Compra inicial', 'FACT-002', 'admin'
FROM "Product" p WHERE p.sku = 'PROD-002'
ON CONFLICT DO NOTHING;

INSERT INTO "InventoryMovement" (tenantid, productid, type, quantity, reason, reference, createdby)
SELECT '1', p.id, 'IN', 45, 'Compra inicial', 'FACT-003', 'admin'
FROM "Product" p WHERE p.sku = 'PROD-003'
ON CONFLICT DO NOTHING;

-- Verificación final
SELECT 
    'Stock corregido y datos insertados' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM "Product") as products_count,
    (SELECT COUNT(*) FROM "InventoryMovement") as movements_count,
    (SELECT SUM(stock) FROM "Product") as total_stock,
    (SELECT SUM(stock * cost) FROM "Product") as total_inventory_value;

-- Verificar estado final del stock
SELECT 
    p.sku,
    p.name,
    p.stock as current_stock,
    p.minStock,
    p.maxStock,
    (SELECT COUNT(*) FROM "InventoryMovement" m WHERE m.productid = p.id) as movement_count,
    (SELECT SUM(CASE WHEN m.type = 'IN' THEN m.quantity ELSE 0 END) 
     FROM "InventoryMovement" m WHERE m.productid = p.id) as total_in,
    (SELECT SUM(CASE WHEN m.type = 'OUT' THEN m.quantity ELSE 0 END) 
     FROM "InventoryMovement" m WHERE m.productid = p.id) as total_out
FROM "Product" p
ORDER BY p.sku;
