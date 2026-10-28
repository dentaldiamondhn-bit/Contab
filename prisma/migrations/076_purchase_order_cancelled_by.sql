-- 076_purchase_order_cancelled_by.sql
-- Fecha: 20 Oct 2026
--
-- MOTIVO: el workflow de Ordenes de Compra no muestra QUIEN cancelo una OC.
-- `cancellation_reason` (075) guarda el motivo, pero no hay columna para el
-- autor, y el servidor ya lo resuelve en `updatePurchaseOrder`:
--
--     if (destino === 'CANCELLED') updates.cancelled_by = actor ?? null;
--
-- Sin la columna, ese UPDATE responde `42703 Could not find the
-- 'cancelled_by' column of 'PurchaseOrder'` y cancelar una OC da 500.
--
-- Mismo patrón que la 075 (la tabla PurchaseOrder se creo fuera de migraciones):
-- ADD COLUMN IF NOT EXISTS + post-check que aborta si falta. Sin GRANT (062).

BEGIN;

DO $$
BEGIN
  IF to_regclass('public."PurchaseOrder"') IS NULL THEN
    RAISE EXCEPTION '076: falta la tabla "PurchaseOrder"';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='cancelled_by'
  ) THEN
    ALTER TABLE "PurchaseOrder" ADD COLUMN cancelled_by text;
    RAISE NOTICE '076: columna cancelled_by anadida';
  ELSE
    RAISE NOTICE '076: cancelled_by ya existia';
  END IF;
END $$;

-- Post-check: la columna debe existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='cancelled_by'
  ) THEN
    RAISE EXCEPTION '076 post-check: falta la columna cancelled_by';
  END IF;

  RAISE NOTICE '076: cancelled_by existe correctamente';
END $$;

COMMIT;
