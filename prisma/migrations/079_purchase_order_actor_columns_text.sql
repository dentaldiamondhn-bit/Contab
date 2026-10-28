-- 079_purchase_order_actor_columns_text.sql
-- Fecha: 21 Oct 2026
--
-- MOTIVO (medido en el OpenAPI de PostgREST, no supuesto): en la BD real
-- `PurchaseOrder.requested_by`, `approved_by` y `received_by` son **uuid**
-- (columnas creadas a mano fuera de migraciones). La 075 intentó añadirlas
-- como `text`, pero `ADD COLUMN IF NOT EXISTS` NO cambia el tipo si la columna
-- ya existe: se lo tragó en silencio (misma lección de AGENTS.md §5).
--
-- El código escribe NOMBRES legibles en las tres:
--   * requested_by  — el formulario "Solicitado por" (relleno automático con el
--                     usuario de la sesión desde el 088)
--   * approved_by / received_by — `nombreDeUsuarioActual()` (085)
-- Con uuid, un nombre da `22P02 invalid input syntax for type uuid` en el
-- primer INSERT/UPDATE que lo lleve, o sea un 500 al crear/aprobar/recepcionar.
-- `cancelled_by` ya es text (076) y no se toca.
--
-- `USING <col>::text` conserva cualquier uuid ya guardado (hoy solo puede haber
-- NULL: cualquier nombre habría fallado antes de escribirse).
-- Idempotente: solo altera si la columna sigue en uuid; post-check que aborta
-- si alguna quedó sin ser text.

BEGIN;

DO $$
DECLARE
  v_col text;
BEGIN
  IF to_regclass('public."PurchaseOrder"') IS NULL THEN
    RAISE EXCEPTION '079: falta la tabla "PurchaseOrder"';
  END IF;

  FOREACH v_col IN ARRAY ARRAY['requested_by','approved_by','received_by'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='PurchaseOrder'
        AND column_name=v_col AND data_type='uuid'
    ) THEN
      EXECUTE format(
        'ALTER TABLE "PurchaseOrder" ALTER COLUMN %I TYPE text USING %I::text',
        v_col, v_col
      );
      RAISE NOTICE '079: PurchaseOrder.% de uuid a text', v_col;
    ELSE
      RAISE NOTICE '079: PurchaseOrder.% ya no es uuid', v_col;
    END IF;
  END LOOP;
END $$;

-- Post-check: las tres columnas deben quedar en text
DO $$
DECLARE
  v_faltan text[] := ARRAY[]::text[];
  v_col text;
BEGIN
  FOREACH v_col IN ARRAY ARRAY['requested_by','approved_by','received_by'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='PurchaseOrder'
        AND column_name=v_col AND data_type='text'
    ) THEN
      v_faltan := v_faltan || v_col;
    END IF;
  END LOOP;

  IF array_length(v_faltan, 1) > 0 THEN
    RAISE EXCEPTION '079 post-check: siguen sin ser text: %', array_to_string(v_faltan, ', ');
  END IF;

  RAISE NOTICE '079: requested_by, approved_by y received_by son text';
END $$;

COMMIT;
