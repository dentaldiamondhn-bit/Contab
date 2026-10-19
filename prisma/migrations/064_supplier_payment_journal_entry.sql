-- 064_supplier_payment_journal_entry.sql
-- Asiento contable de los PAGOS a proveedor (8 Oct 2026).
--
-- Un pago a proveedor era un movimiento de caja SIN asiento: se registraba en
-- `SupplierPayment` y el libro no lo veia. Ahora cada pago crea su asiento
-- (debe Cuentas por Pagar / haber Banco-Caja) via `createJournalTransaction`
-- (cabecera `Transaction` + lineas `JournalEntry`), y esta columna guarda el id
-- de esa `Transaction` para poder revertirlo/rehacerlo al editar o borrar el pago.
--
--   * "SupplierPayment" -> + journal_entry_id text (id de `Transaction`).
--
-- Tipo `text` porque `Transaction.id` es text. Sin FK: el aislamiento y la
-- integridad los hace el codigo, igual que el resto del modulo de Compras
-- (059/060/061). Nullable: los pagos historicos no tienen asiento.
--
-- Idempotente: `IF NOT EXISTS`. Se aplica a mano en el SQL Editor de Supabase.
-- Espera el `RAISE NOTICE '064: listo'` al final.

BEGIN;

DO $$
DECLARE
  v_filas_sin_columna bigint;
BEGIN
  -- Preflight: sin la tabla de pagos no hay a que anadirle el asiento.
  IF to_regclass('public."SupplierPayment"') IS NULL THEN
    RAISE EXCEPTION '064: falta la tabla "SupplierPayment"';
  END IF;

  -- Sin FK a `Transaction` a proposito (mismo criterio que 059/060/061).
  ALTER TABLE "SupplierPayment" ADD COLUMN IF NOT EXISTS journal_entry_id text;

  CREATE INDEX IF NOT EXISTS idx_supplier_payment_journal_entry
    ON "SupplierPayment"(journal_entry_id);

  -- Post-check: la columna tiene que existir.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SupplierPayment'
      AND column_name = 'journal_entry_id'
  ) THEN
    RAISE EXCEPTION '064: post-check: falta SupplierPayment.journal_entry_id';
  END IF;

  -- Solo informativo: cuantos pagos NO tienen asiento (los historicos).
  SELECT count(*) INTO v_filas_sin_columna
  FROM "SupplierPayment"
  WHERE journal_entry_id IS NULL;
  RAISE NOTICE '064: % pago(s) sin asiento (historicos)', v_filas_sin_columna;

  RAISE NOTICE '064: listo';
END $$;

COMMIT;
