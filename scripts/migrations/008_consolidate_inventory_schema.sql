-- ============================================================================
-- MIGRACIÓN 008: CONSOLIDACIÓN DE ESQUEMA DE INVENTARIO
-- ============================================================================
-- Objetivo: unificar el esquema dual de productos/movimientos en las tablas
-- canónicas en snake_case: product + inventory_movement.
--
-- Tablas canónicas (se conservan):
--   product            (inventario principal, snake_case)
--   inventory_movement (kardex, snake_case)
--   warehouse          (bodegas)
--   Supplier / SupplierPayment
--   inventory_adjustment / inventory_adjustment_item
--   inventory_transfer  / inventory_transfer_item
--
-- Tablas duplicadas (se migran y se eliminan):
--   "Product"  (PascalCase)      -> product
--   "Products" (VISTA sobre "Product", PascalCase plural) -> product  [se borra con DROP VIEW]
--   products   (lowercase plural) -> product
--   "InventoryMovement" (PascalCase) -> inventory_movement
--   "InventoryTransaction" (PascalCase, vacía) -> inventory_movement
--
-- Datos huérfanos (tenant_id sin Tenant real, p.ej. '1' o 'DENTALWD') se
-- OMITEN. Solo se migran filas de tenants existentes.
--
-- Idempotente en las secciones 1 y 7-9 (ADD COLUMN IF NOT EXISTS / IF EXISTS).
-- Las secciones 2-6 referencian las tablas legacy: si ya se ejecutó esta
-- migración (tablas eliminadas), NO se debe volver a correr. Ejecutar UNA vez.
-- Transaccional. Ejecutar en el SQL Editor de Supabase.
-- Fecha: 2026-09-16
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Extender product con columnas que solo existían en "Product"
--    (promociones, descuentos, etiquetas, proveedor, auditoría)
-- ----------------------------------------------------------------------------
ALTER TABLE product ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE product ADD COLUMN IF NOT EXISTS is_discount boolean DEFAULT false;
ALTER TABLE product ADD COLUMN IF NOT EXISTS discount_price bigint;
ALTER TABLE product ADD COLUMN IF NOT EXISTS promotion_start_date date;
ALTER TABLE product ADD COLUMN IF NOT EXISTS promotion_end_date date;
ALTER TABLE product ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE product ADD COLUMN IF NOT EXISTS supplier_id text;

-- ----------------------------------------------------------------------------
-- 2. Migrar "Product" (PascalCase) -> product
--    Dedupe por (tenant_id, code). Se preserva el id para no romper FKs.
-- ----------------------------------------------------------------------------
INSERT INTO product (
  id, tenant_id, code, name, description, unit,
  unit_price, current_cost, tax_rate, is_service, is_active,
  current_stock, stock_quantity, min_stock, max_stock,
  category, product_type, valuation_method,
  expiration_date, tags, is_discount, discount_price,
  promotion_start_date, promotion_end_date, created_by,
  created_at, updated_at
)
SELECT
  p.id,
  p.tenantid,
  COALESCE(NULLIF(p.sku, ''), 'PRD-' || substr(p.id::text, 1, 8)),
  p.name,
  p.description,
  COALESCE(p.unit, 'Unidad'),
  COALESCE(p.price, 0),
  COALESCE(p.cost, 0),
  15,
  false,
  COALESCE(p."isActive", true),
  COALESCE(p.stock, 0),
  COALESCE(p.stock, 0),
  COALESCE(p.minstock, 0),
  COALESCE(p.maxstock, 0),
  p.category,
  'product',
  'weighted_average',
  p."expirationDate",
  COALESCE(to_jsonb(p.tags), '[]'::jsonb),
  COALESCE(p."isDiscount", false),
  p."discountPrice",
  p."promotionStartDate",
  p."promotionEndDate",
  p.createdby,
  COALESCE(p.createdat, now()),
  COALESCE(p.updatedat, now())
FROM "Product" p
WHERE p.tenantid IN (SELECT id FROM "Tenant")
  AND NOT EXISTS (
    SELECT 1 FROM product x
    WHERE x.tenant_id = p.tenantid
      AND x.code = COALESCE(NULLIF(p.sku, ''), 'PRD-' || substr(p.id::text, 1, 8))
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Migrar "Products" (PascalCase plural) -> product
-- ----------------------------------------------------------------------------
INSERT INTO product (
  id, tenant_id, code, name, description, unit,
  unit_price, current_cost, tax_rate, is_service, is_active,
  current_stock, stock_quantity, min_stock, max_stock,
  category, product_type, valuation_method,
  expiration_date, tags, is_discount, discount_price,
  promotion_start_date, promotion_end_date,
  created_at, updated_at
)
SELECT
  p.id,
  p.tenantid,
  COALESCE(NULLIF(p.sku, ''), 'PRD-' || substr(p.id::text, 1, 8)),
  p.name,
  p.description,
  COALESCE(p.unit, 'Unidad'),
  COALESCE(p.price, 0),
  COALESCE(p.cost, 0),
  15,
  false,
  COALESCE(p."isActive", true),
  COALESCE(p.stock, 0),
  COALESCE(p.stock, 0),
  COALESCE(p.minstock, 0),
  COALESCE(p.maxstock, 0),
  p.category,
  'product',
  'weighted_average',
  p."expirationDate",
  COALESCE(to_jsonb(p.tags), '[]'::jsonb),
  COALESCE(p."isDiscount", false),
  p."discountPrice",
  p."promotionStartDate",
  p."promotionEndDate",
  COALESCE(p.createdat, now()),
  COALESCE(p.updatedat, now())
FROM "Products" p
WHERE p.tenantid IN (SELECT id FROM "Tenant")
  AND NOT EXISTS (
    SELECT 1 FROM product x
    WHERE x.tenant_id = p.tenantid
      AND x.code = COALESCE(NULLIF(p.sku, ''), 'PRD-' || substr(p.id::text, 1, 8))
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. Migrar products (lowercase plural) -> product
-- ----------------------------------------------------------------------------
INSERT INTO product (
  id, tenant_id, code, name, description, unit,
  unit_price, current_cost, tax_rate, is_service, is_active,
  current_stock, stock_quantity, min_stock, max_stock,
  category, product_type, valuation_method,
  created_at, updated_at
)
SELECT
  p.id,
  p.tenant_id,
  COALESCE(NULLIF(p.sku, ''), 'PRD-' || substr(p.id::text, 1, 8)),
  p.name,
  p.description,
  'Unidad',
  COALESCE(p.price, 0),
  COALESCE(p.cost, 0),
  15,
  false,
  COALESCE(p.is_active, true),
  COALESCE(p.stock, 0),
  COALESCE(p.stock, 0),
  0,
  0,
  p.category,
  'product',
  'weighted_average',
  COALESCE(p.created_at, now()),
  COALESCE(p.updated_at, now())
FROM products p
WHERE p.tenant_id IN (SELECT id FROM "Tenant")
  AND NOT EXISTS (
    SELECT 1 FROM product x
    WHERE x.tenant_id = p.tenant_id
      AND x.code = COALESCE(NULLIF(p.sku, ''), 'PRD-' || substr(p.id::text, 1, 8))
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. Migrar "InventoryMovement" -> inventory_movement
-- ----------------------------------------------------------------------------
INSERT INTO inventory_movement (
  id, tenant_id, product_id, movement_type, movement_reason,
  quantity, unit_cost, total_cost, stock_before, stock_after,
  reference_number, notes, created_by, created_at, updated_at
)
SELECT
  m.id,
  m.tenantid,
  m.productid,
  COALESCE(m.type, 'IN'),
  COALESCE(m.reason, 'migrado'),
  m.quantity,
  0,
  0,
  0,
  0,
  m.reference,
  NULL,
  m.createdby,
  COALESCE(m.createdat, now()),
  COALESCE(m.createdat, now())
FROM "InventoryMovement" m
WHERE m.tenantid IN (SELECT id FROM "Tenant")
  AND EXISTS (SELECT 1 FROM product x WHERE x.id = m.productid)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. Migrar "InventoryTransaction" (vacía) -> inventory_movement
-- ----------------------------------------------------------------------------
INSERT INTO inventory_movement (
  id, tenant_id, product_id, movement_type, movement_reason,
  quantity, unit_cost, total_cost, stock_before, stock_after,
  reference_number, notes, created_at, updated_at
)
SELECT
  t.id::uuid,
  t.tenantid,
  t.productid::uuid,
  COALESCE(t.transactiontype, 'IN'),
  COALESCE(t.transactiontype, 'migrado'),
  t.quantity,
  COALESCE(t.unitcost, 0),
  COALESCE(t.totalcost, 0),
  0,
  0,
  t.reference,
  t.notes,
  COALESCE(t.createdat, now()),
  COALESCE(t.createdat, now())
FROM "InventoryTransaction" t
WHERE t.tenantid IN (SELECT id FROM "Tenant")
  AND EXISTS (SELECT 1 FROM product x WHERE x.id = t.productid::uuid)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. Normalizar Supplier (tenant_id huérfano -> company_id real)
--    y añadir columnas usadas por la UI (creditLimit/currentBalance)
-- ----------------------------------------------------------------------------
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS credit_limit bigint DEFAULT 0;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS current_balance bigint DEFAULT 0;

UPDATE "Supplier"
SET tenant_id = company_id
WHERE company_id IN (SELECT id FROM "Tenant")
  AND (tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM "Tenant"));

-- ----------------------------------------------------------------------------
-- 8. Backup de tablas legacy y eliminación de duplicados
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS _backup_Product_008           AS SELECT * FROM "Product";
CREATE TABLE IF NOT EXISTS _backup_Products_008          AS SELECT * FROM "Products";
CREATE TABLE IF NOT EXISTS _backup_products_008          AS SELECT * FROM products;
CREATE TABLE IF NOT EXISTS _backup_InventoryMovement_008 AS SELECT * FROM "InventoryMovement";
CREATE TABLE IF NOT EXISTS _backup_InventoryTransaction_008 AS SELECT * FROM "InventoryTransaction";

-- Repuntar TODAS las FKs que apuntan a las tablas legacy hacia las canónicas
-- (product / inventory_movement), conservando nombre, columnas y acción.
-- Se saltan las FK de las propias tablas legacy (se eliminan más abajo).
-- Se recrean con NOT VALID: puede haber referencias colgantes (p.ej. los
-- paquetes de prueba apuntan a productos del tenant huérfano '1', no migrados).
-- La FK queda activa para filas nuevas sin fallar por las existentes.
DO $$
DECLARE
  r record;
  def text;
BEGIN
  FOR r IN
    SELECT conrelid::regclass::text AS tbl,
           conname,
           pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid IN (to_regclass('public."Product"'),
                        to_regclass('public."InventoryMovement"'))
      AND conrelid::regclass::text NOT IN (
        '"Product"',
        '"Products"',
        'products',
        '"InventoryMovement"',
        '"InventoryTransaction"'
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    def := replace(r.def, 'REFERENCES public."Product"', 'REFERENCES product');
    def := replace(def, 'REFERENCES "Product"', 'REFERENCES product');
    def := replace(def, 'REFERENCES public."InventoryMovement"', 'REFERENCES inventory_movement');
    def := replace(def, 'REFERENCES "InventoryMovement"', 'REFERENCES inventory_movement');
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s NOT VALID', r.tbl, r.conname, def);
  END LOOP;
END $$;

-- OJO: "Products" NO es una tabla, es una VISTA (definida en
-- ADD_DISCOUNT_TO_PRODUCTS.sql / ADD_EXPIRATION_DATE.sql como
--   CREATE VIEW "Products" AS SELECT ... FROM "Product" WHERE "isActive" = true).
-- Por eso se decide el tipo real con pg_class.relkind antes de borrar:
--   'r' tabla, 'v' vista, 'm' vista materializada.
-- Las vistas dependientes ("PackageDetails", y la propia "Products") caen por
-- CASCADE; "PackageDetails" se vuelve a crear más abajo apuntando a product.
DO $$
DECLARE
  t text;
  k "char";
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'InventoryTransaction', 'InventoryMovement', 'Products', 'products', 'Product'
  ] LOOP
    SELECT c.relkind INTO k
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = t
      AND c.relkind IN ('r', 'p', 'v', 'm')
    ORDER BY CASE c.relkind WHEN 'r' THEN 1 WHEN 'p' THEN 2 WHEN 'v' THEN 3 ELSE 4 END
    LIMIT 1;

    IF k IS NULL THEN
      CONTINUE;
    ELSIF k = 'v' THEN
      EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', t);
    ELSIF k = 'm' THEN
      EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I CASCADE', t);
    ELSE
      EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', t);
    END IF;
  END LOOP;
END $$;

-- El trigger legacy movement_update_stock (sobre "InventoryMovement") se elimina
-- junto con la tabla. En el esquema canónico el stock (product.current_stock /
-- stock_quantity) lo actualiza la aplicación:
--   * app/inventory/page.tsx (handleMovement / alta de producto)
--   * app/api/inventory/movements/route.ts
--   * components/inventory/InventoryManager.tsx
-- NO se recrea el trigger para evitar doble conteo.
DROP FUNCTION IF EXISTS update_stock_on_movement() CASCADE;

-- "PackageDetails" dependía de "Product" (ver ADD_PROMOTION_FIELD.sql:25-54) y
-- fue eliminada por CASCADE al borrar "Product". Se recrea contra el producto
-- canónico (product). Único mapeo de columnas:
--   pr."name"  -> pr.name        (igual)
--   pr."price" -> pr.unit_price  (product.unit_price es bigint)
CREATE OR REPLACE VIEW "PackageDetails" AS
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
                'productname', pr.name,
                'quantity', pp."quantity",
                'productprice', pr.unit_price
            ) ORDER BY pr.name
        ) FILTER (WHERE pr.id IS NOT NULL),
        '[]'::json
    ) AS "products",
    COALESCE(SUM(pp."quantity"), 0) AS "total_items"
FROM "Packages" p
LEFT JOIN "PackageProducts" pp ON p."id" = pp."packageid"
LEFT JOIN product pr ON pp."productid" = pr.id
GROUP BY p."id", p."tenantid", p."name", p."description", p."price",
         p."promotionprice", p."isactive", p."ispromotion",
         p."promotionstartdate", p."promotionenddate", p."createdat", p."updatedat";

-- NOTA: las funciones create_package_with_products() / update_package() /
-- delete_package() (PACKAGES_SYSTEM_COMPLETE.sql / ADD_PROMOTION_FIELD.sql)
-- todavía leen de "Product" en su cuerpo. No se llaman desde la app (verificado)
-- y Postgres no las invalida al borrar la tabla, así que quedan sin efecto
-- (fallarían en tiempo de ejecución). Si algún día se usan, hay que reapuntarlas
-- a product.

-- Las FKs (PackageProducts.productid, PurchaseOrderItem.productId, etc.) ya
-- fueron repuntadas a product(id) con NOT VALID en el bloque anterior.
-- Si quisieras limpiar referencias colgantes de paquetes (opcional):
--   DELETE FROM "PackageProducts" pp
--   WHERE NOT EXISTS (SELECT 1 FROM product p WHERE p.id = pp.productid);
--   ALTER TABLE "PackageProducts" VALIDATE CONSTRAINT "PackageProducts_productid_fkey";

COMMIT;

-- ============================================================================
-- VERIFICACIÓN (ejecutar por separado)
-- ============================================================================
-- SELECT count(*) AS productos_canonicos FROM product;
-- SELECT tenant_id, count(*) FROM product GROUP BY tenant_id;
-- SELECT count(*) AS movimientos_canonicos FROM inventory_movement;
-- SELECT tenant_id, count(*) FROM inventory_movement GROUP BY tenant_id;
-- SELECT to_regclass('public."Product"')  AS debe_ser_null;   -- NULL
-- SELECT to_regclass('public."Products"') AS debe_ser_null;   -- NULL
-- SELECT to_regclass('public.products')   AS debe_ser_null;   -- NULL
-- SELECT to_regclass('public."InventoryMovement"') AS debe_ser_null; -- NULL
-- SELECT to_regclass('public."InventoryTransaction"') AS debe_ser_null; -- NULL
-- SELECT * FROM product WHERE tenant_id = 'ANGELOH7' ORDER BY code;
-- SELECT * FROM inventory_movement WHERE tenant_id = 'ANGELOH7';
-- SELECT * FROM inventory_stock_alert WHERE tenant_id = 'ANGELOH7';
