-- =====================================================
-- VERIFICAR Y CORREGIR TIPOS DE DATOS
-- =====================================================

-- Verificar tipos de datos actuales en las tablas
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

-- Verificar si existen tablas con nombres similares y sus tipos
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (table_name = 'product' OR table_name = 'inventory_movement' OR table_name = 'Product' OR table_name = 'InventoryMovement')
ORDER BY table_name, ordinal_position;

-- Si las tablas existen pero con tipos incorrectos, eliminarlas y recrear
DO $$
BEGIN
    -- Eliminar tablas si existen con tipos incorrectos
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Product'
    ) THEN
        DROP TABLE "Product" CASCADE;
        RAISE NOTICE 'Tabla Product eliminada para recrear con tipos correctos';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'InventoryMovement'
    ) THEN
        DROP TABLE "InventoryMovement" CASCADE;
        RAISE NOTICE 'Tabla InventoryMovement eliminada para recrear con tipos correctos';
    END IF;
END $$;

-- Crear tablas con tipos de datos correctos
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

CREATE TABLE "InventoryMovement" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenantid TEXT NOT NULL,
    productid UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
    quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reference TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    createdby TEXT,
    
    -- Constraints
    CONSTRAINT movement_quantity_nonnegative CHECK (quantity > 0)
);

-- Crear la clave foránea correctamente
ALTER TABLE "InventoryMovement" 
ADD CONSTRAINT "InventoryMovement_productid_fkey" 
FOREIGN KEY (productid) REFERENCES "Product"(id) ON DELETE CASCADE;

-- Crear índices
CREATE INDEX idx_product_tenantid ON "Product"(tenantid);
CREATE INDEX idx_product_sku ON "Product"(sku);
CREATE INDEX idx_product_category ON "Product"(category);
CREATE INDEX idx_product_isactive ON "Product"(isActive);
CREATE INDEX idx_product_stock_low ON "Product"(stock, minStock);

CREATE INDEX idx_movement_tenantid ON "InventoryMovement"(tenantid);
CREATE INDEX idx_movement_productid ON "InventoryMovement"(productid);
CREATE INDEX idx_movement_type ON "InventoryMovement"(type);
CREATE INDEX idx_movement_createdat ON "InventoryMovement"(createdat);

-- Crear triggers
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

-- Crear políticas RLS
CREATE POLICY "Enable Product operations" ON "Product"
    FOR ALL
    USING (tenantid IS NOT NULL AND tenantid != '')
    WITH CHECK (tenantid IS NOT NULL AND tenantid != '');

CREATE POLICY "Enable InventoryMovement operations" ON "InventoryMovement"
    FOR ALL
    USING (tenantid IS NOT NULL AND tenantid != '')
    WITH CHECK (tenantid IS NOT NULL AND tenantid != '');

-- Insertar datos de ejemplo
INSERT INTO "Product" (tenantid, sku, name, description, category, unit, cost, price, stock, minStock, maxStock) VALUES
('1', 'PROD-001', 'Material de Empaque Pequeño', 'Cajas de cartón para empaque pequeño', 'Empaque', 'Cajas', 5.50, 8.00, 150, 20, 200),
('1', 'PROD-002', 'Material de Limpieza', 'Kit de limpieza para consultorio dental', 'Limpieza', 'Unidades', 25.00, 45.00, 8, 10, 50),
('1', 'PROD-003', 'Guantes Desechables', 'Guantes de látex tamaño M', 'Insumos Médicos', 'Cajas', 12.00, 18.00, 45, 15, 100);

-- Insertar movimientos de ejemplo
INSERT INTO "InventoryMovement" (tenantid, productid, type, quantity, reason, reference, createdby)
SELECT '1', p.id, 'IN', 50, 'Compra nueva', 'FACT-001', 'admin'
FROM "Product" p WHERE p.sku = 'PROD-001';

INSERT INTO "InventoryMovement" (tenantid, productid, type, quantity, reason, reference, createdby)
SELECT '1', p.id, 'OUT', 5, 'Verificar stock actualizado', 'TEST-003', 'system'
FROM "Product" p WHERE p.sku = 'PROD-002';

-- Verificar creación
SELECT 
    'Tablas de inventario creadas exitosamente' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM "Product") as products_count,
    (SELECT COUNT(*) FROM "InventoryMovement") as movements_count;

-- Verificar estructura final
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
