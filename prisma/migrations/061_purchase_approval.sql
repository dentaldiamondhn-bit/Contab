-- 061_purchase_approval.sql
-- Workflow de aprobacion de compras (8 Oct 2026).
--
-- Compras pasa a tener aprobacion PREVIA OBLIGATORIA: una compra nace en
-- `PENDING_APPROVAL` y NO toca inventario ni contabilidad hasta que un aprobador
-- la aprueba (o la rechaza). El flujo y el aislamiento por empresa viven en el
-- codigo; aqui solo van las columnas de estado y la lista de aprobadores.
--
--   * "Purchase"           -> + approval_status/approved_by/approved_at/
--                             rejected_by/rejected_at/rejection_reason.
--   * "PurchaseApprover"   -> que usuarios (a nivel de empresa) pueden aprobar.
--                             El Gerente (rol MANAGER) la administra desde la UI;
--                             el aislamiento es por `company_id`.
--
-- Tipos: `company_id` es `text` (apunta a `companies.id`, que es text) y
-- `approved_by`/`rejected_by`/`user_id` son `text` (apuntan a `"User".id`, que es
-- text). Sin FK: el aislamiento lo hace el codigo, igual que el resto del modulo.
--
-- Idempotente: la columna se anade con `IF NOT EXISTS` y el backfill de las filas
-- LEGACY (previas al workflow) solo corre la primera vez; re-ejecutar la migracion
-- NO aprobaria compras pendientes nuevas.
--
-- Se aplica a mano en el SQL Editor de Supabase. Espera el
-- `RAISE NOTICE '061: listo'` al final.

BEGIN;

DO $$
DECLARE
  v_tenia_columna boolean;
BEGIN
  -- Preflight: sin la tabla de Compras no hay a que anadirle aprobacion.
  IF to_regclass('public."Purchase"') IS NULL THEN
    RAISE EXCEPTION '061: falta la tabla "Purchase"';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Purchase'
      AND column_name = 'approval_status'
  ) INTO v_tenia_columna;

  -- Columnas de aprobacion. `IF NOT EXISTS` no cambia el tipo si ya existen.
  ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'PENDING_APPROVAL';
  ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS approved_by text;
  ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS approved_at timestamptz;
  ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS rejected_by text;
  ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
  ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS rejection_reason text;

  IF v_tenia_columna THEN
    RAISE NOTICE '061: columnas de aprobacion ya existian (no se toca el backfill)';
  ELSE
    -- Backfill de una sola vez: las compras que existian ANTES del workflow se
    -- consideran aprobadas (ya estaban aplicadas: inventario y asiento hechos).
    -- El guard `v_tenia_columna` evita que un re-run apruebe pendientes nuevas.
    UPDATE "Purchase"
    SET approval_status = 'APPROVED',
        approved_at = COALESCE(approved_at, created_at, now())
    WHERE approval_status = 'PENDING_APPROVAL';
    RAISE NOTICE '061: columnas creadas y compras legacy marcadas APPROVED';
  END IF;

  CREATE INDEX IF NOT EXISTS idx_purchase_approval_status
    ON "Purchase"(company_id, approval_status);

  -- Lista de aprobadores por empresa (la designa el Gerente).
  IF to_regclass('public."PurchaseApprover"') IS NULL THEN
    CREATE TABLE "PurchaseApprover" (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id  text NOT NULL,
      tenant_id   text,
      user_id     text NOT NULL,
      created_by  text,
      created_at  timestamptz DEFAULT now()
    );
    RAISE NOTICE '061: creada "PurchaseApprover"';
  ELSE
    RAISE NOTICE '061: "PurchaseApprover" ya existia';
  END IF;

  CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseApprover_company_user_key"
    ON "PurchaseApprover"(company_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_purchase_approver_company
    ON "PurchaseApprover"(company_id);

  ALTER TABLE "PurchaseApprover" ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Allow all for service_role on PurchaseApprover" ON "PurchaseApprover";
  CREATE POLICY "Allow all for service_role on PurchaseApprover" ON "PurchaseApprover"
    FOR ALL USING (auth.role() = 'service_role');
  GRANT ALL ON "PurchaseApprover" TO service_role;

  -- Post-check: si algo no quedo, rollback.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Purchase'
      AND column_name = 'approval_status'
  ) THEN
    RAISE EXCEPTION '061: post-check: falta Purchase.approval_status';
  END IF;

  IF to_regclass('public."PurchaseApprover"') IS NULL THEN
    RAISE EXCEPTION '061: post-check: falta "PurchaseApprover"';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    WHERE ic.relname = 'PurchaseApprover_company_user_key' AND i.indisunique
  ) THEN
    RAISE EXCEPTION '061: post-check: falta el unique (company_id, user_id)';
  END IF;

  RAISE NOTICE '061: listo';
END $$;

COMMIT;
