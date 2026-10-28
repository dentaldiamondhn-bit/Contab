-- 078_purchase_order_edit_history.sql
-- Fecha: 21 Oct 2026
--
-- MOTIVO: el workflow de la OC debe mostrar TODAS las modificaciones con su
-- autor y fecha (pasos "Modificada" entre Creada y Aprobada). Una fila por
-- edicion real de datos de la orden: quien, cuando y de que orden. Los cambios
-- de estado (aprobar/cancelar) NO se registran aqui: tienen su propio paso en el
-- timeline con su propio autor.
--
-- Sin la tabla, cada PATCH de datos falla al registrar la fila (fail-closed,
-- mismo patron que `cancelled_by` de la 076) y el GET degrada a `edits: []`
-- (no tumbar la lectura mientras la migracion este pendiente).
--
-- Tipos medidos en el OpenAPI de PostgREST antes de escribir esto:
-- `PurchaseOrder.id` es uuid (default gen_random_uuid()) y su `tenant_id` es
-- character varying. `company_id` en el padre viene declarado uuid, pero aqui
-- va como text y sin FK: es el valor de `companies.id` (text en el maestro) y
-- solo se usa para filtrar con `.eq('company_id')`, donde text es mas permisivo
-- y matchea igual.
--
-- ON DELETE CASCADE: borrar la OC limpia su historial (`deletePurchaseOrder`).
-- Sin GRANT (062): solo service_role la alcanza; la lectura va por /api.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public."PurchaseOrder"') IS NULL THEN
    RAISE EXCEPTION '078: falta la tabla "PurchaseOrder"';
  END IF;

  IF to_regclass('public."PurchaseOrderEdit"') IS NULL THEN
    CREATE TABLE "PurchaseOrderEdit" (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      purchase_order_id uuid NOT NULL REFERENCES "PurchaseOrder"(id) ON DELETE CASCADE,
      tenant_id character varying NOT NULL,
      company_id text NOT NULL,
      edited_by text,
      edited_at timestamptz NOT NULL DEFAULT now()
    );
    RAISE NOTICE '078: tabla "PurchaseOrderEdit" creada';
  ELSE
    RAISE NOTICE '078: "PurchaseOrderEdit" ya existia';
  END IF;
END $$;

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS "PurchaseOrderEdit_purchase_order_id_idx"
    ON "PurchaseOrderEdit"(purchase_order_id);
END $$;

-- Post-check: columnas clave tipadas y NOT NULL (patron 075/076/077).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrderEdit'
      AND column_name='purchase_order_id' AND is_nullable='NO' AND data_type='uuid'
  ) THEN
    RAISE EXCEPTION '078 post-check: falta purchase_order_id uuid NOT NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrderEdit'
      AND column_name='company_id' AND is_nullable='NO' AND data_type='text'
  ) THEN
    RAISE EXCEPTION '078 post-check: falta company_id text NOT NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='PurchaseOrderEdit'
      AND column_name='edited_at' AND is_nullable='NO'
  ) THEN
    RAISE EXCEPTION '078 post-check: falta edited_at NOT NULL';
  END IF;

  RAISE NOTICE '078: "PurchaseOrderEdit" verificada';
END $$;

COMMIT;
