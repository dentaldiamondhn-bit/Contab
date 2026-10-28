-- 077_purchase_order_item_price_includes_tax.sql
-- Fecha: 21 Oct 2026
--
-- MOTIVO: en el modal de la OC cada articulo debe poder indicar si su precio
-- ya incluye ISV o no. Sin la columna, `createPurchaseOrder` /
-- `updatePurchaseOrder` responden `42703` al persistir el flag por linea y la
-- recepcion no puede desglosar el impuesto por articulo.
--
-- DEFAULT false = las filas viejas quedan como se comportaban antes: el ISV se
-- suma encima del precio tecleado. Mismo patron que la 075/076 (la tabla se
-- creo fuera de migraciones): ADD COLUMN IF NOT EXISTS + post-check que aborta
-- si falta. Sin GRANT (062).

BEGIN;

DO $$
BEGIN
  IF to_regclass('public."PurchaseOrderItem"') IS NULL THEN
    RAISE EXCEPTION '077: falta la tabla "PurchaseOrderItem"';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrderItem' AND column_name='price_includes_tax'
  ) THEN
    ALTER TABLE "PurchaseOrderItem" ADD COLUMN price_includes_tax boolean NOT NULL DEFAULT false;
    RAISE NOTICE '077: columna price_includes_tax anadida';
  ELSE
    RAISE NOTICE '077: price_includes_tax ya existia';
  END IF;
END $$;

-- Post-check: la columna debe existir y NO aceptar nulos (las filas viejas ya
-- quedaron en false por el DEFAULT).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrderItem'
      AND column_name='price_includes_tax' AND is_nullable='NO'
  ) THEN
    RAISE EXCEPTION '077 post-check: falta la columna price_includes_tax NOT NULL';
  END IF;

  RAISE NOTICE '077: price_includes_tax existe correctamente';
END $$;

COMMIT;
