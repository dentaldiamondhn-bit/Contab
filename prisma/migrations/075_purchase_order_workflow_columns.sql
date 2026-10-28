-- 075_purchase_order_workflow_columns.sql
-- Fecha: 20 Oct 2026
--
-- MOTIVO: `lib/purchase-orders-db.ts` usa columnas en `PurchaseOrder` que no
-- existen en la BD. La más visible es `cancellation_reason`: al cancelar una OC,
-- PostgREST responde:
--   Error: Could not find the 'cancellation_reason' column of 'PurchaseOrder'
--          in the schema cache
--
-- La tabla fue creada fuera de migraciones (probablemente a mano en el SQL
-- Editor), así que el repo no tiene su DDL original. Las columnas que el
-- código YA escribe o lee (medido en purchase-orders-db.ts y page.tsx):
--
--   * requested_by      — quién pidió la OC (UI + CAMPOS_EDITABLES)
--   * approved_by       — quién aprobó (verificarOrdenAprobada + updates)
--   * approved_at       — cuándo aprobó
--   * cancellation_reason — motivo obligatorio al cancelar (400 si falta)
--   * received_by       — quién recibió (recibirPurchaseOrder)
--   * received_at       — cuándo recibió
--   * purchase_id       — FK lógica a la compra creada al recibir
--
-- Idempotente: cada columna se añade con ADD COLUMN IF NOT EXISTS.
-- Sin GRANT (regla 062: service_role ya tiene acceso).

BEGIN;

DO $$
DECLARE
  v_col text;
BEGIN
  -- Preflight: la tabla debe existir
  IF to_regclass('public."PurchaseOrder"') IS NULL THEN
    RAISE EXCEPTION '075: falta la tabla "PurchaseOrder"';
  END IF;

  -- 1. requested_by (texto libre: nombre de quien solicita)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='requested_by'
  ) THEN
    ALTER TABLE "PurchaseOrder" ADD COLUMN requested_by text;
    RAISE NOTICE '075: columna requested_by anadida';
  ELSE
    RAISE NOTICE '075: requested_by ya existia';
  END IF;

  -- 2. approved_by (texto: nombre o id de quien aprobó)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='approved_by'
  ) THEN
    ALTER TABLE "PurchaseOrder" ADD COLUMN approved_by text;
    RAISE NOTICE '075: columna approved_by anadida';
  ELSE
    RAISE NOTICE '075: approved_by ya existia';
  END IF;

  -- 3. approved_at (timestamp)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='approved_at'
  ) THEN
    ALTER TABLE "PurchaseOrder" ADD COLUMN approved_at timestamptz;
    RAISE NOTICE '075: columna approved_at anadida';
  ELSE
    RAISE NOTICE '075: approved_at ya existia';
  END IF;

  -- 4. cancellation_reason (texto: motivo obligatorio al cancelar)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='cancellation_reason'
  ) THEN
    ALTER TABLE "PurchaseOrder" ADD COLUMN cancellation_reason text;
    RAISE NOTICE '075: columna cancellation_reason anadida';
  ELSE
    RAISE NOTICE '075: cancellation_reason ya existia';
  END IF;

  -- 5. received_by (texto)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='received_by'
  ) THEN
    ALTER TABLE "PurchaseOrder" ADD COLUMN received_by text;
    RAISE NOTICE '075: columna received_by anadida';
  ELSE
    RAISE NOTICE '075: received_by ya existia';
  END IF;

  -- 6. received_at (timestamp)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='received_at'
  ) THEN
    ALTER TABLE "PurchaseOrder" ADD COLUMN received_at timestamptz;
    RAISE NOTICE '075: columna received_at anadida';
  ELSE
    RAISE NOTICE '075: received_at ya existia';
  END IF;

  -- 7. purchase_id (uuid: compra creada al recibir; sin FK porque la 052
  --    documenta que PurchaseOrder.company_id tampoco tiene FK y la tabla
  --    Purchase usa uuid como id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='purchase_id'
  ) THEN
    ALTER TABLE "PurchaseOrder" ADD COLUMN purchase_id uuid;
    RAISE NOTICE '075: columna purchase_id anadida';
  ELSE
    RAISE NOTICE '075: purchase_id ya existia';
  END IF;

  -- Índice para buscar compras desde la orden
  CREATE INDEX IF NOT EXISTS idx_po_purchase_id ON "PurchaseOrder"(purchase_id);
END $$;

-- Post-check: las 7 columnas deben existir
DO $$
DECLARE
  v_faltan text[] := ARRAY[]::text[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='requested_by'
  ) THEN v_faltan := v_faltan || 'requested_by'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='approved_by'
  ) THEN v_faltan := v_faltan || 'approved_by'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='approved_at'
  ) THEN v_faltan := v_faltan || 'approved_at'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='cancellation_reason'
  ) THEN v_faltan := v_faltan || 'cancellation_reason'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='received_by'
  ) THEN v_faltan := v_faltan || 'received_by'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='received_at'
  ) THEN v_faltan := v_faltan || 'received_at'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrder' AND column_name='purchase_id'
  ) THEN v_faltan := v_faltan || 'purchase_id'; END IF;

  IF array_length(v_faltan, 1) > 0 THEN
    RAISE EXCEPTION '075 post-check: faltan columnas: %', array_to_string(v_faltan, ', ');
  END IF;

  RAISE NOTICE '075: las 7 columnas existen correctamente';
END $$;

COMMIT;
