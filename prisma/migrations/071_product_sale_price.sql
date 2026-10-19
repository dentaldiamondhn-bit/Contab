-- 071_product_sale_price.sql
--
-- Añade precio de venta a la tabla product (tabla real usada por inventario).
-- APLICADA y verificada el 8 Oct 2026 (SQL Editor -> "Success. No rows returned").
-- Verificado con service_role: sale_price existe, defaults 0, filas existentes OK.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.product') IS NULL THEN
    RAISE EXCEPTION '071: falta la tabla product';
  END IF;
END $$;

ALTER TABLE public.product
  ADD COLUMN IF NOT EXISTS sale_price bigint DEFAULT 0;

DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'product'
    AND column_name  = 'sale_price';
  IF n = 0 THEN
    RAISE EXCEPTION '071: no se creo sale_price en product';
  END IF;
  RAISE NOTICE '071: OK - product.sale_price añadido';
END $$;

COMMIT;
