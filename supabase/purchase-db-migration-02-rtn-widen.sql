-- Autofix v2: ensancha Supplier.rtn a varchar(20) recreando automáticamente las vistas dependientes.
-- Todo ocurre en UN solo bloque (no requiere tablas temporales entre sentencias).

DO $$
DECLARE rec record;
BEGIN
  -- 1) Capturar las vistas que dependen de Supplier/Purchase/SupplierPayment
  CREATE TEMP TABLE tmp_views AS
    SELECT DISTINCT cl2.relname::text AS view_name,
           pg_get_viewdef(cl2.oid, true) AS view_def
    FROM pg_depend d
    JOIN pg_rewrite r ON d.classid = 'pg_rewrite'::regclass AND d.objid = r.oid AND r.ev_class <> 0
    JOIN pg_class cl1 ON d.refclassid = 'pg_class'::regclass AND d.refobjid = cl1.oid
      AND cl1.relname IN ('Supplier', 'Purchase', 'SupplierPayment')
    JOIN pg_class cl2 ON cl2.oid = r.ev_class AND cl2.relkind = 'v';

  -- 2) Eliminar las vistas dependientes
  FOR rec IN SELECT view_name, view_def FROM tmp_views LOOP
    EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', rec.view_name);
  END LOOP;

  -- 3) Alterar la columna
  EXECUTE 'ALTER TABLE "Supplier" ALTER COLUMN rtn TYPE varchar(20)';

  -- 4) Recrear cada vista con su definición original
  FOR rec IN SELECT view_name, view_def FROM tmp_views LOOP
    EXECUTE format('CREATE VIEW %I AS %s', rec.view_name, rec.view_def);
  END LOOP;

  DROP TABLE tmp_views;
END $$;

-- 5) Garantizar purchase_book_sar exista (definición conocida)
CREATE OR REPLACE VIEW "purchase_book_sar" AS
 SELECT p.id,
    p.invoice_date,
    p.invoice_number,
    s.rtn AS supplier_rtn,
    s.name AS supplier_name,
    p.cai,
    p.subtotal AS net_value,
    p.tax_amount AS tax_value,
    p.total AS total_value,
    p.purchase_type,
    p.expense_category,
    p.tenant_id
   FROM "Purchase" p
     JOIN "Supplier" s ON s.id = p.supplier_id
  WHERE p.status::text <> 'CANCELLED'::text
  ORDER BY p.invoice_date DESC;

-- 6) Recargar esquema en PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificación: rtn debe decir character varying con longitud 20 y las vistas deben existir
SELECT table_name, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Supplier' AND column_name = 'rtn';

SELECT table_name FROM information_schema.views
WHERE table_schema = 'public' AND table_name IN ('purchase_book_sar', 'accounts_payable_pending')
ORDER BY table_name;