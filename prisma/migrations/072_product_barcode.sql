-- 072_product_barcode.sql
--
-- Añade el código de barras a la tabla product (la tabla real de inventario).
--   barcode           -> valor codificado (texto editable + botón "Generar").
--   barcode_image_url -> foto opcional de un código de barras impreso; si existe,
--                        la UI la muestra en vez de la imagen generada.
--
-- Las dos son NULLABLE a propósito: los productos existentes no tienen código.
--
-- NO se pone UNIQUE. La regla del proyecto es que ninguna restricción de
-- unicidad separe empresas, y aquí además la unicidad del valor generado se
-- comprueba en código (dentro de la empresa) al pulsar "Generar".
--
-- PENDIENTE de aplicar en el SQL Editor de Supabase (el asistente no puede
-- ejecutar DDL). Se valida con: node scripts/validar-040.mjs

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.product') IS NULL THEN
    RAISE EXCEPTION '072: falta la tabla product';
  END IF;
END $$;

ALTER TABLE public.product
  ADD COLUMN IF NOT EXISTS barcode text;

ALTER TABLE public.product
  ADD COLUMN IF NOT EXISTS barcode_image_url text;

DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'product'
    AND column_name IN ('barcode', 'barcode_image_url');
  IF n <> 2 THEN
    RAISE EXCEPTION '072: faltan columnas de codigo de barras en product (hay % de 2)', n;
  END IF;
  RAISE NOTICE '072: OK - product.barcode y product.barcode_image_url disponibles';
END $$;

COMMIT;
