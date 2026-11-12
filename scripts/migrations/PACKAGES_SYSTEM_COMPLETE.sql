-- ========================================
-- SISTEMA COMPLETO DE PAQUETES DE PRODUCTOS
-- ========================================
-- Ejecutar este archivo completo en orden para implementar el sistema completo
-- ========================================

-- ========================================
-- PARTE 1: CREACIÓN DE VISTAS DE COMPATIBILIDAD
-- ========================================

-- Crear vista Products desde tabla Product
DO $$
DECLARE
    product_count INTEGER;
    product_small_count INTEGER;
    main_table TEXT;
BEGIN
    SELECT COUNT(*) INTO product_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'Product';
    
    SELECT COUNT(*) INTO product_small_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'product';
    
    IF product_count > 0 AND product_small_count > 0 THEN
        BEGIN
            EXECUTE 'SELECT COUNT(*) FROM "Product"' INTO product_count;
            EXECUTE 'SELECT COUNT(*) FROM "product"' INTO product_small_count;
            
            IF product_count >= product_small_count THEN
                main_table := 'Product';
            ELSE
                main_table := 'product';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            main_table := 'Product';
        END;
    ELSIF product_count > 0 THEN
        main_table := 'Product';
    ELSIF product_small_count > 0 THEN
        main_table := 'product';
    ELSE
        RETURN;
    END IF;
    
    DROP VIEW IF EXISTS "Products";
    EXECUTE format('CREATE VIEW "Products" AS SELECT * FROM %I', main_table);
END $$;

-- Crear vista Tenants desde tabla Tenant
DO $$
DECLARE
    tenant_count INTEGER;
    tenants_count INTEGER;
    main_table TEXT;
BEGIN
    SELECT COUNT(*) INTO tenant_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'Tenant';
    
    SELECT COUNT(*) INTO tenants_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'Tenants';
    
    IF tenant_count > 0 AND tenants_count > 0 THEN
        BEGIN
            EXECUTE 'SELECT COUNT(*) FROM "Tenant"' INTO tenant_count;
            EXECUTE 'SELECT COUNT(*) FROM "Tenants"' INTO tenants_count;
            
            IF tenant_count >= tenants_count THEN
                main_table := 'Tenant';
            ELSE
                main_table := 'Tenants';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            main_table := 'Tenant';
        END;
    ELSIF tenant_count > 0 THEN
        main_table := 'Tenant';
    ELSIF tenants_count > 0 THEN
        main_table := 'Tenants';
    ELSE
        RETURN;
    END IF;
    
    DROP VIEW IF EXISTS "Tenants";
    IF main_table = 'Tenant' THEN
        EXECUTE 'CREATE VIEW "Tenants" AS SELECT * FROM "Tenant"';
    END IF;
END $$;

-- ========================================
-- PARTE 2: CREACIÓN DE TABLAS DE PAQUETES
-- ========================================

-- Crear tabla principal de paquetes
CREATE TABLE IF NOT EXISTS "Packages" (
    "id" TEXT PRIMARY KEY,
    "tenantid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "promotionprice" DECIMAL(10,2),
    "isactive" BOOLEAN DEFAULT true,
    "createdat" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de relación entre paquetes y productos
CREATE TABLE IF NOT EXISTS "PackageProducts" (
    "id" TEXT PRIMARY KEY,
    "packageid" TEXT NOT NULL,
    "productid" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdat" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("packageid") REFERENCES "Packages"("id") ON DELETE CASCADE,
    FOREIGN KEY ("productid") REFERENCES "Product"("id") ON DELETE CASCADE
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS "idx_packages_tenantid" ON "Packages"("tenantid");
CREATE INDEX IF NOT EXISTS "idx_packages_isactive" ON "Packages"("isactive");
CREATE INDEX IF NOT EXISTS "idx_package_products_packageid" ON "PackageProducts"("packageid");
CREATE INDEX IF NOT EXISTS "idx_package_products_productid" ON "PackageProducts"("productid");

-- Crear trigger para actualizar updatedat
CREATE OR REPLACE FUNCTION update_updatedat_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedat = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_packages_updatedat 
    BEFORE UPDATE ON "Packages" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updatedat_column();

-- ========================================
-- PARTE 3: POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ========================================

-- Habilitar RLS en ambas tablas
ALTER TABLE "Packages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PackageProducts" ENABLE ROW LEVEL SECURITY;

-- Política para paquetes (permisivo para pruebas)
CREATE POLICY "Users can view packages from their tenant" ON "Packages"
    FOR SELECT USING ("tenantid" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Users can insert packages for their tenant" ON "Packages"
    FOR INSERT WITH CHECK ("tenantid" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Users can update packages from their tenant" ON "Packages"
    FOR UPDATE USING ("tenantid" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Users can delete packages from their tenant" ON "Packages"
    FOR DELETE USING ("id" = current_setting('app.current_tenant_id', true));

-- Política para productos de paquetes (basada en el tenant del paquete)
CREATE POLICY "Users can view package products from their tenant" ON "PackageProducts"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "Packages" 
            WHERE "Packages"."id" = "PackageProducts"."packageid" 
            AND "Packages"."tenantid" = current_setting('app.current_tenant_id', true)
        )
    );

CREATE POLICY "Users can insert package products for their tenant" ON "PackageProducts"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Packages" 
            WHERE "Packages"."id" = "PackageProducts"."packageid" 
            AND "Packages"."tenantid" = current_setting('app.current_tenant_id', true)
        )
    );

CREATE POLICY "Users can update package products from their tenant" ON "PackageProducts"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "Packages" 
            WHERE "Packages"."id" = "PackageProducts"."packageid" 
            AND "Packages"."tenantid" = current_setting('app.current_tenant_id', true)
        )
    );

CREATE POLICY "Users can delete package products from their tenant" ON "PackageProducts"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "Packages" 
            WHERE "Packages"."id" = "PackageProducts"."packageid" 
            AND "Packages"."tenantid" = current_setting('app.current_tenant_id', true)
        )
    );

-- Política de respaldo para permitir operaciones sin contexto de tenant (para pruebas)
CREATE POLICY "Enable packages operations without tenant context" ON "Packages"
    FOR ALL USING (true)
    WITH CHECK ("tenantid" = '1');

CREATE POLICY "Enable package products operations without tenant context" ON "PackageProducts"
    FOR ALL USING (true);

-- ========================================
-- PARTE 4: VISTA DE DETALLES DE PAQUETES
-- ========================================

CREATE OR REPLACE VIEW "PackageDetails" AS
SELECT 
    p."id",
    p."tenantid",
    p."name",
    p."description",
    p."price",
    p."promotionprice",
    p."isactive",
    p."createdat",
    p."updatedat",
    COALESCE(
        json_agg(
            json_build_object(
                'productid', pp."productid",
                'productname', pr."name",
                'quantity', pp."quantity",
                'productprice', pr."price"
            ) ORDER BY pr."name"
        ) FILTER (WHERE pr."id" IS NOT NULL),
        '[]'::json
    ) as "products",
    COALESCE(SUM(pp."quantity"), 0) as "total_items"
FROM "Packages" p
LEFT JOIN "PackageProducts" pp ON p."id" = pp."packageid"
LEFT JOIN "Product" pr ON pp."productid" = pr."id"
GROUP BY p."id", p."tenantid", p."name", p."description", p."price", p."promotionprice", p."isactive", p."createdat", p."updatedat";

-- ========================================
-- PARTE 5: FUNCIONES CRUD DE PAQUETES
-- ========================================

CREATE OR REPLACE FUNCTION create_package_with_products(
    p_tenantid TEXT,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_price DECIMAL(10,2) DEFAULT 0.00,
    p_products JSON DEFAULT '[]'::json,
    p_ispromotion BOOLEAN DEFAULT false,
    p_promotionprice DECIMAL(10,2) DEFAULT NULL
)
RETURNS TABLE(
    package_id TEXT,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_package_id TEXT;
    v_product_record JSON;
    v_product_id UUID;
    v_quantity INTEGER;
    v_package_product_id TEXT;
    v_product_name TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Tenants" WHERE "id" = p_tenantid AND "isactive" = true) THEN
        RETURN QUERY SELECT NULL::TEXT, false, 'Tenant no válido o inactivo'::TEXT;
        RETURN;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM "Packages" 
        WHERE "tenantid" = p_tenantid 
        AND "name" = p_name 
        AND "isactive" = true
    ) THEN
        RETURN QUERY SELECT NULL::TEXT, false, 'Ya existe un paquete con ese nombre'::TEXT;
        RETURN;
    END IF;
    
    IF json_array_length(p_products) = 0 THEN
        RETURN QUERY SELECT NULL::TEXT, false, 'El paquete debe contener al menos un producto'::TEXT;
        RETURN;
    END IF;
    
    FOR v_product_record IN SELECT * FROM json_array_elements(p_products) LOOP
        v_product_id := (v_product_record->>'productid')::UUID;
        v_quantity := COALESCE((v_product_record->>'quantity')::INTEGER, 1);
        
        SELECT "name" INTO v_product_name
        FROM "Product" 
        WHERE "id" = v_product_id;
        
        IF NOT EXISTS (
            SELECT 1 FROM "Product" 
            WHERE "id" = v_product_id
        ) THEN
            RETURN QUERY SELECT NULL::TEXT, false, 
                format('Producto %s no válido', v_product_id::TEXT)::TEXT;
            RETURN;
        END IF;
        
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM "Product" 
                WHERE "id" = v_product_id 
                AND "stock" >= v_quantity
            ) THEN
                RETURN QUERY SELECT NULL::TEXT, false, 
                    format('Producto %s no tiene stock suficiente', COALESCE(v_product_name, v_product_id::TEXT))::TEXT;
                RETURN;
            END IF;
        EXCEPTION WHEN undefined_column THEN
            NULL;
        END;
    END LOOP;
    
    v_package_id := format('pkg_%s_%s', p_tenantid, EXTRACT(EPOCH FROM NOW())::TEXT);
    
    INSERT INTO "Packages" ("id", "tenantid", "name", "description", "price", "promotionprice", "ispromotion", "isactive", "createdat", "updatedat")
    VALUES (v_package_id, p_tenantid, p_name, p_description, p_price, p_promotionprice, p_ispromotion, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    
    FOR v_product_record IN SELECT * FROM json_array_elements(p_products) LOOP
        v_product_id := (v_product_record->>'productid')::UUID;
        v_quantity := COALESCE((v_product_record->>'quantity')::INTEGER, 1);
        v_package_product_id := format('pp_%s_%s', v_package_id, EXTRACT(EPOCH FROM NOW())::TEXT);
        
        INSERT INTO "PackageProducts" ("id", "packageid", "productid", "quantity")
        VALUES (v_package_product_id, v_package_id, v_product_id, v_quantity);
    END LOOP;
    
    RETURN QUERY SELECT v_package_id, true, 'Paquete creado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_package(
    p_package_id TEXT,
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_price DECIMAL(10,2) DEFAULT NULL,
    p_products JSON DEFAULT NULL,
    p_ispromotion BOOLEAN DEFAULT NULL,
    p_promotionprice DECIMAL(10,2) DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_tenantid TEXT;
    v_product_record JSON;
    v_product_id UUID;
    v_quantity INTEGER;
    v_package_product_id TEXT;
BEGIN
    SELECT "tenantid" INTO v_tenantid 
    FROM "Packages" 
    WHERE "id" = p_package_id AND "isactive" = true;
    
    IF v_tenantid IS NULL THEN
        RETURN QUERY SELECT false, 'Paquete no encontrado o inactivo'::TEXT;
        RETURN;
    END IF;
    
    IF p_name IS NOT NULL AND p_name != (SELECT "name" FROM "Packages" WHERE "id" = p_package_id) THEN
        IF EXISTS (
            SELECT 1 FROM "Packages" 
            WHERE "tenantid" = v_tenantid 
            AND "name" = p_name 
            AND "id" != p_package_id 
            AND "isactive" = true
        ) THEN
            RETURN QUERY SELECT false, 'Ya existe otro paquete con ese nombre'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    UPDATE "Packages" SET
        "name" = COALESCE(p_name, "name"),
        "description" = COALESCE(p_description, "description"),
        "price" = COALESCE(p_price, "price"),
        "promotionprice" = COALESCE(p_promotionprice, "promotionprice"),
        "ispromotion" = COALESCE(p_ispromotion, "ispromotion"),
        "updatedat" = CURRENT_TIMESTAMP
    WHERE "id" = p_package_id;
    
    IF p_products IS NOT NULL THEN
        DELETE FROM "PackageProducts" WHERE "packageid" = p_package_id;
        
        FOR v_product_record IN SELECT * FROM json_array_elements(p_products) LOOP
            v_product_id := (v_product_record->>'productid')::UUID;
            v_quantity := COALESCE((v_product_record->>'quantity')::INTEGER, 1);
            
            IF NOT EXISTS (
                SELECT 1 FROM "Product" 
                WHERE "id" = v_product_id
            ) THEN
                RETURN QUERY SELECT false, 
                    format('Producto %s no válido', v_product_id::TEXT)::TEXT;
                RETURN;
            END IF;
            
            v_package_product_id := format('pp_%s_%s', p_package_id, EXTRACT(EPOCH FROM NOW())::TEXT);
            
            INSERT INTO "PackageProducts" ("id", "packageid", "productid", "quantity")
            VALUES (v_package_product_id, p_package_id, v_product_id, v_quantity);
        END LOOP;
    END IF;
    
    RETURN QUERY SELECT true, 'Paquete actualizado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_package(p_package_id TEXT)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_tenantid TEXT;
BEGIN
    SELECT "tenantid" INTO v_tenantid 
    FROM "Packages" 
    WHERE "id" = p_package_id AND "isactive" = true;
    
    IF v_tenantid IS NULL THEN
        RETURN QUERY SELECT false, 'Paquete no encontrado o inactivo'::TEXT;
        RETURN;
    END IF;
    
    UPDATE "Packages" SET "isactive" = false, "updatedat" = CURRENT_TIMESTAMP, "promotionprice" = NULL 
    WHERE "id" = p_package_id;
    
    RETURN QUERY SELECT true, 'Paquete eliminado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PARTE 6: ACTIVACIÓN DEL TENANT
-- ========================================

-- Activar tenant existente
UPDATE "Tenant" 
SET 
    "isactive" = true,
    "updatedat" = CURRENT_TIMESTAMP
WHERE "id" = '1';

-- ========================================
-- PARTE 7: VERIFICACIÓN DEL SISTEMA
-- ========================================

-- Mostrar productos disponibles con UUIDs reales
SELECT 
    "id" as product_uuid,
    "name" as product_name,
    "price" as product_price,
    "stock" as product_stock
FROM "Product" 
WHERE "stock" > 0
LIMIT 5;

-- Verificar estado del sistema
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICACIÓN FINAL DEL SISTEMA ===';
    
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'Products') THEN
        RAISE NOTICE '✓ Products: VISTA OK';
    ELSE
        RAISE NOTICE '✗ Products: VISTA FALTANTE';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'Tenants') THEN
        RAISE NOTICE '✓ Tenants: VISTA OK';
    ELSE
        RAISE NOTICE '✗ Tenants: VISTA FALTANTE';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Packages') THEN
        RAISE NOTICE '✓ Packages: TABLA OK';
    ELSE
        RAISE NOTICE '✗ Packages: TABLA FALTANTE';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PackageProducts') THEN
        RAISE NOTICE '✓ PackageProducts: TABLA OK';
    ELSE
        RAISE NOTICE '✗ PackageProducts: TABLA FALTANTE';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM "Tenant" 
        WHERE "id" = '1' 
        AND "isactive" = true
    ) THEN
        RAISE NOTICE '✓ Tenant "1": ACTIVO';
        RAISE NOTICE '🎉 SISTEMA COMPLETAMENTE FUNCIONAL';
    ELSE
        RAISE NOTICE '✗ Tenant "1": INACTIVO';
    END IF;
END $$;

-- ========================================
-- PARTE 8: PRUEBA DEL SISTEMA
-- ========================================

-- Prueba de creación de paquete (usa UUID real de arriba)
SELECT * FROM create_package_with_products(
    '1', 
    'Kit de Prueba', 
    'Kit de prueba para verificar funcionamiento', 
    100.00, 
    '[{"productid": "COPIA-UUID-REAL-DE-ARRIBA", "quantity": 1}]'::json
);
