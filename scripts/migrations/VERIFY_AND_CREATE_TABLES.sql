-- =====================================================
-- VERIFICAR Y CREAR TABLAS DE INVENTARIO
-- =====================================================

-- Verificar qué tablas existen actualmente
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%product%' OR table_name LIKE '%movement%')
ORDER BY table_name;

-- Verificar si existen tablas con nombres similares
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name = 'product' OR table_name = 'inventory_movement' OR table_name = 'Product' OR table_name = 'InventoryMovement')
ORDER BY table_name;

-- Crear tablas si no existen con los nombres correctos
DO $$
BEGIN
    -- Crear tabla Product si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Product'
    ) THEN
        CREATE TABLE "Product" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenantid TEXT NOT NULL,
            sku TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            unit TEXT NOT NULL,
            cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            stock INTEGER NOT NULL DEFAULT 0,
            minStock INTEGER NOT NULL DEFAULT 0,
            maxStock INTEGER NOT NULL DEFAULT 100,
            isActive BOOLEAN NOT NULL DEFAULT true,
            createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            createdby TEXT,
            
            -- Constraints
            CONSTRAINT product_cost_nonnegative CHECK (cost >= 0),
            CONSTRAINT product_price_nonnegative CHECK (price >= 0),
            CONSTRAINT product_stock_nonnegative CHECK (stock >= 0),
            CONSTRAINT product_min_stock_nonnegative CHECK (minStock >= 0),
            CONSTRAINT product_max_stock_nonnegative CHECK (maxStock >= 0),
            CONSTRAINT product_max_stock_greater_min CHECK (maxStock >= minStock)
        );
        
        RAISE NOTICE 'Tabla Product creada exitosamente';
    END IF;
    
    -- Crear tabla InventoryMovement si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'InventoryMovement'
    ) THEN
        CREATE TABLE "InventoryMovement" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenantid TEXT NOT NULL,
            productid UUID NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
            type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
            quantity INTEGER NOT NULL,
            reason TEXT NOT NULL,
            reference TEXT,
            createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            createdby TEXT,
            
            -- Constraints
            CONSTRAINT movement_quantity_nonnegative CHECK (quantity > 0)
        );
        
        RAISE NOTICE 'Tabla InventoryMovement creada exitosamente';
    END IF;
END $$;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_product_tenantid ON "Product"(tenantid);
CREATE INDEX IF NOT EXISTS idx_product_sku ON "Product"(sku);
CREATE INDEX IF NOT EXISTS idx_product_category ON "Product"(category);
CREATE INDEX IF NOT EXISTS idx_product_isactive ON "Product"(isActive);
CREATE INDEX IF NOT EXISTS idx_product_stock_low ON "Product"(stock, minStock);

CREATE INDEX IF NOT EXISTS idx_movement_tenantid ON "InventoryMovement"(tenantid);
CREATE INDEX IF NOT EXISTS idx_movement_productid ON "InventoryMovement"(productid);
CREATE INDEX IF NOT EXISTS idx_movement_type ON "InventoryMovement"(type);
CREATE INDEX IF NOT EXISTS idx_movement_createdat ON "InventoryMovement"(createdat);

-- Crear triggers si no existen
CREATE OR REPLACE FUNCTION update_product_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_update_timestamp
    BEFORE UPDATE ON "Product"
    FOR EACH ROW
    EXECUTE FUNCTION update_product_timestamp();

CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'OUT' THEN
        UPDATE "Product"
        SET stock = stock - NEW.quantity,
            updatedat = NOW()
        WHERE id = NEW.productid;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto no encontrado';
        END IF;

        -- Verificar que el stock no sea negativo
        IF (SELECT stock FROM "Product" WHERE id = NEW.productid) < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente para salida';
        END IF;

    ELSIF NEW.type = 'IN' THEN
        UPDATE "Product"
        SET stock = stock + NEW.quantity,
            updatedat = NOW()
        WHERE id = NEW.productid;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto no encontrado';
        END IF;

    ELSIF NEW.type = 'ADJUSTMENT' THEN
        UPDATE "Product"
        SET stock = NEW.quantity,
            updatedat = NOW()
        WHERE id = NEW.productid;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto no encontrado';
        END IF;

        -- Verificar que el stock ajustado no sea negativo
        IF NEW.quantity < 0 THEN
            RAISE EXCEPTION 'El stock ajustado no puede ser negativo';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER movement_update_stock
    AFTER INSERT ON "InventoryMovement"
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_movement();

-- Habilitar RLS
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryMovement" ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS si no existen
DROP POLICY IF EXISTS "Enable Product operations" ON "Product";
CREATE POLICY "Enable Product operations" ON "Product"
    FOR ALL
    USING (tenantid IS NOT NULL AND tenantid != '')
    WITH CHECK (tenantid IS NOT NULL AND tenantid != '');

DROP POLICY IF EXISTS "Enable InventoryMovement operations" ON "InventoryMovement";
CREATE POLICY "Enable InventoryMovement operations" ON "InventoryMovement"
    FOR ALL
    USING (tenantid IS NOT NULL AND tenantid != '')
    WITH CHECK (tenantid IS NOT NULL AND tenantid != '');

-- Insertar datos de ejemplo
INSERT INTO "Product" (tenantid, sku, name, description, category, unit, cost, price, stock, minStock, maxStock) VALUES
('1', 'PROD-001', 'Material de Empaque Pequeño', 'Cajas de cartón para empaque pequeño', 'Empaque', 'Cajas', 5.50, 8.00, 150, 20, 200),
('1', 'PROD-002', 'Material de Limpieza', 'Kit de limpieza para consultorio dental', 'Limpieza', 'Unidades', 25.00, 45.00, 8, 10, 50),
('1', 'PROD-003', 'Guantes Desechables', 'Guantes de látex tamaño M', 'Insumos Médicos', 'Cajas', 12.00, 18.00, 45, 15, 100)
ON CONFLICT (sku) DO NOTHING;

-- Insertar movimientos de ejemplo
INSERT INTO "InventoryMovement" (tenantid, productid, type, quantity, reason, reference, createdby)
SELECT '1', p.id, 'IN', 50, 'Compra nueva', 'FACT-001', 'admin'
FROM "Product" p WHERE p.sku = 'PROD-001'
ON CONFLICT DO NOTHING;

INSERT INTO "InventoryMovement" (tenantid, productid, type, quantity, reason, reference, createdby)
SELECT '1', p.id, 'OUT', 5, 'Uso diario', 'USO-001', 'user1'
FROM "Product" p WHERE p.sku = 'PROD-002'
ON CONFLICT DO NOTHING;

-- Verificar creación
SELECT 
    'Tablas de inventario creadas exitosamente' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM "Product") as products_count,
    (SELECT COUNT(*) FROM "InventoryMovement") as movements_count;
