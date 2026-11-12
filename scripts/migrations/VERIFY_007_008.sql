-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN 007 (facturas) + 008 (inventario)
-- ============================================================================
-- Ejecutar DESPUÉS de correr, en este orden:
--   1) scripts/migrations/007_consolidate_invoice_schema.sql
--   2) scripts/migrations/008_consolidate_inventory_schema.sql
--
-- Todas las consultas son SOLO LECTURA. Cada bloque indica el resultado
-- esperado en el comentario.
-- ============================================================================


-- ============================================================================
-- A. TABLAS LEGACY: deben devolver NULL (ya no existen)
-- ============================================================================
SELECT
  to_regclass('public.invoice')            AS legacy_invoice,          -- NULL
  to_regclass('public.invoiceitem')        AS legacy_invoiceitem,      -- NULL
  to_regclass('public.invoices')           AS legacy_invoices,         -- NULL
  to_regclass('public.invoice_items')      AS legacy_invoice_items,    -- NULL
  to_regclass('public."Product"')          AS dup_Product,             -- NULL
  to_regclass('public."Products"')         AS dup_Products,            -- NULL
  to_regclass('public.products')           AS dup_products,            -- NULL
  to_regclass('public."InventoryMovement"')     AS dup_InventoryMovement,    -- NULL
  to_regclass('public."InventoryTransaction"')  AS dup_InventoryTransaction; -- NULL


-- ============================================================================
-- B. TABLAS CANÓNICAS: deben existir (no NULL)
-- ============================================================================
SELECT
  to_regclass('public."Invoice"')          AS invoice,              -- NO NULL
  to_regclass('public."InvoiceItem"')      AS invoice_item,         -- NO NULL
  to_regclass('public.product')            AS product,              -- NO NULL
  to_regclass('public.inventory_movement') AS inventory_movement,   -- NO NULL
  to_regclass('public."Supplier"')         AS supplier,             -- NO NULL
  to_regclass('public."PackageDetails"')   AS package_details;      -- NO NULL (vista recreada)


-- ============================================================================
-- C. BACKUPS creados por las migraciones (deben tener filas>0 donde había datos)
-- ============================================================================
-- NOTA: los nombres se escribieron sin comillas, así que Postgres los guardó en
-- minúsculas. Además "_backup_Products_008" colapsa con "_backup_products_008"
-- (mismo objeto). Tablas reales: _backup_product_008, _backup_products_008,
-- _backup_inventorymovement_008, _backup_inventorytransaction_008.
SELECT '_backup_Product_008'           AS tabla, count(*) AS filas FROM _backup_product_008
UNION ALL SELECT '_backup_products_008 (ex Products)', count(*) FROM _backup_products_008
UNION ALL SELECT '_backup_InventoryMovement_008',      count(*) FROM _backup_inventorymovement_008
UNION ALL SELECT '_backup_InventoryTransaction_008',   count(*) FROM _backup_inventorytransaction_008
ORDER BY tabla;
-- Esperado: product=5, products=5, inventorymovement=8, inventorytransaction=0.


-- ============================================================================
-- D. FACTURAS (007)
-- ============================================================================
-- D1. Conteos totales. Los datos actuales eran "Invoice"=0 / "InvoiceItem"=0
--     y POS legacy `invoice`=8 / `invoiceitem`=7 (tenant '1' se OMITE).
SELECT count(*) AS facturas FROM "Invoice";
SELECT count(*) AS items    FROM "InvoiceItem";

-- D2. Facturas por tenant y estado.
SELECT "tenantId", status, count(*) AS facturas, sum(total) AS total_lempiras
FROM "Invoice"
GROUP BY "tenantId", status
ORDER BY "tenantId", status;

-- D3. No deben quedar columnas en minúsculas duplicadas en "Invoice".
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Invoice'
  AND column_name ~ '^[a-z]+$'      -- minúsculas puras = duplicados legacy
ORDER BY column_name;               -- esperado: 0 filas

-- D4. Vistas fiscales recreadas (deben existir).
SELECT
  to_regclass('public.libro_ventas')        AS libro_ventas,
  to_regclass('public.libro_compras')       AS libro_compras,
  to_regclass('public.resumen_isv')         AS resumen_isv,
  to_regclass('public.declaracion_mensual') AS declaracion_mensual,
  to_regclass('public.top_clientes')        AS top_clientes,
  to_regclass('public.cuentas_por_cobrar')  AS cuentas_por_cobrar,
  to_regclass('public.cuentas_por_pagar')   AS cuentas_por_pagar,
  to_regclass('public."InvoiceSummary"')    AS invoice_summary;

-- D5. Prueba de lectura de las vistas (no deben dar error).
-- SELECT * FROM libro_ventas LIMIT 5;
-- SELECT * FROM "InvoiceSummary" LIMIT 5;
-- SELECT * FROM resumen_isv LIMIT 5;


-- ============================================================================
-- E. INVENTARIO (008)
-- ============================================================================
-- E1. Conteos canónicos por tenant.
SELECT tenant_id, count(*) AS productos, sum(current_stock) AS stock_total
FROM product
GROUP BY tenant_id
ORDER BY tenant_id;

SELECT tenant_id, count(*) AS movimientos
FROM inventory_movement
GROUP BY tenant_id
ORDER BY tenant_id;

-- E2. Columnas nuevas agregadas a product (deben existir).
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'product'
  AND column_name IN ('tags','is_discount','discount_price',
                      'promotion_start_date','promotion_end_date',
                      'created_by','supplier_id')
ORDER BY column_name;   -- esperado: 7 filas

-- E3. Consistencia stock: current_stock debe estar sincronizado con stock_quantity.
--     Solo tenants reales. (El tenant huérfano '1' tiene filas demo preexistentes
--     con current_stock=100/stock_quantity=0; no las gestiona la app.)
SELECT count(*) AS filas_desincronizadas
FROM product
WHERE current_stock IS DISTINCT FROM stock_quantity
  AND tenant_id IN (SELECT id FROM "Tenant");   -- esperado: 0

-- E3b. Informativo: desfases en tenants huérfanos (no bloqueante).
SELECT tenant_id, code, current_stock, stock_quantity
FROM product
WHERE current_stock IS DISTINCT FROM stock_quantity
  AND tenant_id NOT IN (SELECT id FROM "Tenant")
ORDER BY tenant_id, code;

-- E4. Integridad: movimientos sin producto válido (huérfanos).
SELECT count(*) AS movimientos_huerfanos
FROM inventory_movement m
WHERE m.product_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM product p WHERE p.id = m.product_id);  -- esperado: 0

-- E5. Dedupe en product: no debe haber (tenant_id, code) repetidos.
SELECT tenant_id, code, count(*) AS repetidos
FROM product
GROUP BY tenant_id, code
HAVING count(*) > 1
ORDER BY repetidos DESC;   -- esperado: 0 filas

-- E6. Detalle de productos de ANGELOH7 (revisar el caso "Guantes").
SELECT id, code, name, current_stock, current_cost, unit_price, is_active
FROM product
WHERE tenant_id = 'ANGELOH7'
ORDER BY code;

-- E7. Detalle de movimientos de ANGELOH7.
SELECT id, product_id, movement_type, quantity, movement_reason, created_at
FROM inventory_movement
WHERE tenant_id = 'ANGELOH7'
ORDER BY created_at DESC;

-- E8. Vistas de inventario (basadas en product) deben leerse sin error.
-- SELECT * FROM inventory_stock_alert WHERE tenant_id = 'ANGELOH7';
-- SELECT * FROM inventario_valorizado LIMIT 10;


-- ============================================================================
-- F. SUPPLIER (008)
-- ============================================================================
-- F1. tenant_id normalizado: no debe quedar huérfano si company_id es real.
SELECT count(*) AS proveedores_tenant_huerfano
FROM "Supplier"
WHERE (tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM "Tenant"))
  AND company_id IN (SELECT id FROM "Tenant");   -- esperado: 0

-- F2. Distribución de proveedores por tenant.
SELECT tenant_id, count(*) AS proveedores
FROM "Supplier"
GROUP BY tenant_id
ORDER BY tenant_id;

-- F3. Columnas nuevas en Supplier.
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'Supplier'
  AND column_name IN ('credit_limit','current_balance')
ORDER BY column_name;   -- esperado: 2 filas


-- ============================================================================
-- G. INTEGRIDAD DE FKs (008)
-- ============================================================================
-- G1. PackageProducts.productid debe apuntar ahora a product(id).
SELECT
  con.conname AS constraint_name,
  confrelid::regclass AS apunta_a
FROM pg_constraint con
WHERE con.conrelid = '"PackageProducts"'::regclass
  AND con.contype = 'f';   -- esperado: apunta_a = product

-- G2. Ninguna FK debe seguir apuntando a las tablas eliminadas.
--     Se compara el nombre destino como texto (no `'"Product"'::regclass`,
--     que lanzaría ERROR al no existir la tabla). Esperado: 0 filas.
SELECT con.conname, con.conrelid::regclass AS tabla, con.confrelid::regclass AS apunta_a
FROM pg_constraint con
WHERE con.contype = 'f'
  AND con.confrelid::regclass::text IN ('"Product"', '"InventoryMovement"');

-- G3. Tipo de relación de los objetos legacy/views.
SELECT c.relname,
       CASE c.relkind
         WHEN 'r' THEN 'tabla'
         WHEN 'v' THEN 'vista'
         WHEN 'm' THEN 'matview'
         ELSE c.relkind::text
       END AS tipo
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('Product','Products','products',
                    'InventoryMovement','InventoryTransaction',
                    'PackageDetails','product','inventory_movement')
ORDER BY c.relname;
-- Esperado: 'product' e 'inventory_movement' = tabla;
--           'PackageDetails' = vista;
--           'Product'/'Products'/'products'/'InventoryMovement'/'InventoryTransaction' = no aparecen.



-- ============================================================================
-- H. TRIGGERS en inventory_movement (si el trigger de stock sigue existiendo)
-- ============================================================================
SELECT event_object_table AS tabla, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table IN ('inventory_movement','"InventoryMovement"')
ORDER BY tabla, trigger_name;
-- Si "InventoryMovement" se eliminó, solo deben aparecer triggers de inventory_movement.
