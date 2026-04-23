-- ========================================
-- AGREGAR CAMPO DE PROMOCIÓN A PAQUETES
-- ========================================

-- Agregar columna ispromotion a la tabla Packages
ALTER TABLE "Packages" ADD COLUMN IF NOT EXISTS "ispromotion" BOOLEAN DEFAULT false;

-- Agregar columna promotionprice a la tabla Packages
ALTER TABLE "Packages" ADD COLUMN IF NOT EXISTS "promotionprice" DECIMAL(10,2);

-- Agregar columnas de fechas de promoción
ALTER TABLE "Packages" ADD COLUMN IF NOT EXISTS "promotionstartdate" DATE;
ALTER TABLE "Packages" ADD COLUMN IF NOT EXISTS "promotionenddate" DATE;

-- Actualizar trigger para mantener updatedat
DROP TRIGGER IF EXISTS update_packages_updatedat ON "Packages";
CREATE TRIGGER update_packages_updatedat 
    BEFORE UPDATE ON "Packages" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updatedat_column();

-- Actualizar vista PackageDetails para incluir promoción
DROP VIEW IF EXISTS "PackageDetails";

CREATE VIEW "PackageDetails" AS
SELECT 
    p."id",
    p."tenantid",
    p."name",
    p."description",
    p."price",
    p."promotionprice",
    p."isactive",
    p."ispromotion",
    p."promotionstartdate",
    p."promotionenddate",
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
GROUP BY p."id", p."tenantid", p."name", p."description", p."price", p."promotionprice", p."isactive", p."ispromotion", p."promotionstartdate", p."promotionenddate", p."createdat", p."updatedat";

-- Actualizar función create_package_with_products para incluir promotionprice y fechas
CREATE OR REPLACE FUNCTION create_package_with_products(
    p_tenantid TEXT,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_price DECIMAL(10,2) DEFAULT 0.00,
    p_products JSON DEFAULT '[]'::json,
    p_ispromotion BOOLEAN DEFAULT false,
    p_promotionprice DECIMAL(10,2) DEFAULT NULL,
    p_promotionstartdate DATE DEFAULT NULL,
    p_promotionenddate DATE DEFAULT NULL
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
    
    INSERT INTO "Packages" ("id", "tenantid", "name", "description", "price", "promotionprice", "ispromotion", "promotionstartdate", "promotionenddate", "isactive", "createdat", "updatedat")
    VALUES (v_package_id, p_tenantid, p_name, p_description, p_price, p_promotionprice, p_ispromotion, p_promotionstartdate, p_promotionenddate, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    
    FOR v_product_record IN SELECT * FROM json_array_elements(p_products) LOOP
        v_product_id := (v_product_record->>'productid')::UUID;
        v_quantity := COALESCE((v_product_record->>'quantity')::INTEGER, 1);
        v_package_product_id := format('pp_%s_%s', v_package_id, EXTRACT(EPOCH FROM NOW())::TEXT);
        
        INSERT INTO "PackageProducts" ("id", "packageid", "productid", "quantity", "createdat")
        VALUES (v_package_product_id, v_package_id, v_product_id, v_quantity, CURRENT_TIMESTAMP);
    END LOOP;
    
    RETURN QUERY SELECT v_package_id, true, 'Paquete creado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Actualizar función update_package para incluir promotionprice y fechas
CREATE OR REPLACE FUNCTION update_package(
    p_package_id TEXT,
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_price DECIMAL(10,2) DEFAULT NULL,
    p_products JSON DEFAULT NULL,
    p_ispromotion BOOLEAN DEFAULT NULL,
    p_promotionprice DECIMAL(10,2) DEFAULT NULL,
    p_promotionstartdate DATE DEFAULT NULL,
    p_promotionenddate DATE DEFAULT NULL
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
        "promotionstartdate" = COALESCE(p_promotionstartdate, "promotionstartdate"),
        "promotionenddate" = COALESCE(p_promotionenddate, "promotionenddate"),
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
            
            INSERT INTO "PackageProducts" ("id", "packageid", "productid", "quantity", "createdat")
            VALUES (v_package_product_id, p_package_id, v_product_id, v_quantity, CURRENT_TIMESTAMP);
        END LOOP;
    END IF;
    
    RETURN QUERY SELECT true, 'Paquete actualizado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql;
