-- 065_conciliacion_bancaria_pagos.sql
--
-- Conciliacion bancaria de PAGOS a proveedores (marcar un pago como conciliado
-- contra la cuenta bancaria del extracto). El pago ya genera su asiento (064);
-- aqui solo se guarda la evidencia de que su movimiento de banco se cuadro.
--
--   "SupplierPayment":
--     - is_reconciled            boolean  (ya existia; se normaliza a NOT NULL default false)
--     - reconciled_at            timestamptz  (cuando se concilio)
--     - bank_account_id          text         (bankaccount.id; sin FK, aislamiento por codigo)
--     - reconciliation_reference text         (referencia del extracto, opcional)
--
-- `bank_account_id` es text porque bankaccount.id es text. No se pone FK: el
-- aislamiento y la pertenencia los valida el codigo, igual que en el resto del
-- modulo de Compras (059/060/061/064). Idempotente: se puede correr dos veces.
--
-- Nota: `add column if not exists` NO cambia el tipo ni el NOT NULL de una
-- columna que ya existe, por eso el default y el NOT NULL de is_reconciled se
-- aplican con ALTER explicito despues de rellenar los NULL.
--
-- Se ejecuta a mano en el SQL Editor de Supabase. Debe terminar con "065: listo".

BEGIN;

DO $$
DECLARE
  v_faltan text;
  v_pendientes integer;
BEGIN
  -- Preflight: sin la tabla no hay nada que conciliar.
  IF to_regclass('public."SupplierPayment"') IS NULL THEN
    RAISE EXCEPTION '065: falta la tabla SupplierPayment. Aplica antes las migraciones de Compras.';
  END IF;

  ALTER TABLE "SupplierPayment"
    ADD COLUMN IF NOT EXISTS is_reconciled boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
    ADD COLUMN IF NOT EXISTS bank_account_id text,
    ADD COLUMN IF NOT EXISTS reconciliation_reference text;

  -- Normaliza is_reconciled: rellena los NULL, fija default y NOT NULL.
  UPDATE "SupplierPayment" SET is_reconciled = false WHERE is_reconciled IS NULL;
  ALTER TABLE "SupplierPayment" ALTER COLUMN is_reconciled SET DEFAULT false;
  ALTER TABLE "SupplierPayment" ALTER COLUMN is_reconciled SET NOT NULL;

  -- Indice para el filtro por empresa y estado (la pantalla lista pendientes).
  CREATE INDEX IF NOT EXISTS idx_supplierpayment_company_reconciled
    ON "SupplierPayment" (company_id, is_reconciled);

  -- Post-check: las cuatro columnas deben existir.
  SELECT string_agg(c, ', ') INTO v_faltan
  FROM unnest(ARRAY['is_reconciled', 'reconciled_at', 'bank_account_id', 'reconciliation_reference']) AS c
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'SupplierPayment'
      AND column_name = c
  );
  IF v_faltan IS NOT NULL THEN
    RAISE EXCEPTION '065: faltan columnas en SupplierPayment: %', v_faltan;
  END IF;

  SELECT count(*) INTO v_pendientes FROM "SupplierPayment" WHERE is_reconciled = false;
  RAISE NOTICE '065: % pago(s) pendientes de conciliar', v_pendientes;

  RAISE NOTICE '065: listo';
END $$;

COMMIT;
