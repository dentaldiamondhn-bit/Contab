-- =====================================================
-- INSERTAR DATOS DE EJEMPLO (COLUMNAS YA CORRECTAS)
-- =====================================================

-- Las columnas ya tienen los nombres correctos, solo insertamos datos de ejemplo

-- Insertar datos de ejemplo si no existen
INSERT INTO "Product" (tenantid, sku, name, description, category, unit, cost, price, stock, minStock, maxStock, isActive) VALUES
('1', 'PROD-001', 'Material de Empaque Pequeño', 'Cajas de cartón para empaque pequeño', 'Empaque', 'Cajas', 5.50, 8.00, 150, 20, 200, true),
('1', 'PROD-002', 'Material de Limpieza', 'Kit de limpieza para consultorio dental', 'Limpieza', 'Unidades', 25.00, 45.00, 8, 10, 50, true),
('1', 'PROD-003', 'Guantes Desechables', 'Guantes de látex tamaño M', 'Insumos Médicos', 'Cajas', 12.00, 18.00, 45, 15, 100, true)
ON CONFLICT (sku) DO NOTHING;

-- Insertar movimientos de ejemplo si no existen
INSERT INTO "InventoryMovement" (tenantid, productid, type, quantity, reason, reference, createdby)
SELECT '1', p.id, 'IN', 50, 'Compra nueva', 'FACT-001', 'admin'
FROM "Product" p WHERE p.sku = 'PROD-001'
ON CONFLICT DO NOTHING;

INSERT INTO "InventoryMovement" (tenantid, productid, type, quantity, reason, reference, createdby)
SELECT '1', p.id, 'OUT', 5, 'Verificar stock actualizado', 'TEST-003', 'system'
FROM "Product" p WHERE p.sku = 'PROD-002'
ON CONFLICT DO NOTHING;

-- Verificación final de datos
SELECT 
    'Datos de ejemplo insertados' as status,
    (SELECT COUNT(*) FROM "Product") as products_count,
    (SELECT COUNT(*) FROM "InventoryMovement") as movements_count,
    (SELECT SUM(stock) FROM "Product") as total_stock,
    (SELECT SUM(stock * cost) FROM "Product") as total_inventory_value;

-- Verificar estructura actual
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('Product', 'InventoryMovement')
ORDER BY table_name, ordinal_position;
