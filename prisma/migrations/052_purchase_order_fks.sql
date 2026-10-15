-- 052_purchase_order_fks.sql
-- Anade las FK que le faltaban al modulo de Ordenes de Compra (8 Oct 2026).
--
-- Sintoma: GET /api/purchase-orders daba 500. Causa medida por PostgREST con la
-- `service_role`, no supuesta:
--
--   PGRST200: Could not find a relationship between 'PurchaseOrder' and
--   'supplier_id' ... between 'PurchaseOrder' and 'PurchaseOrderItem'
--
-- Las tablas existen con las columnas correctas (order_number, supplier_id,
-- purchase_order_id, company_id...) pero SIN las FK, asi que los embeds
-- `Supplier:supplier_id(...)` y `PurchaseOrderItem(...)` no resuelven y
-- PostgREST aborta el SELECT entero -> la ruta devuelve 500.
--
-- CONTRAPRUEBA (medida el mismo dia): el embed equivalente del modulo de
-- Compras (`Purchase` con `Supplier:supplier_id` + `items:PurchaseItem`) devuelve
-- 200, o sea que Purchase/PurchaseItem SI tienen sus FK. El modulo O.C. (047) se
-- probo contra el supabase falso, y las tablas reales quedaron sin las relaciones.
--
-- Tipos (medidos por el OpenAPI de PostgREST): PurchaseOrder.id uuid,
-- PurchaseOrder.supplier_id uuid, PurchaseOrderItem.purchase_order_id uuid,
-- "Supplier".id uuid. Compatibles. Las tablas estaban VACIAS (0 filas), asi que
-- ninguna FK puede fallar por datos.
--
-- Nota de aislamiento: NO hay FK de `company_id` porque `PurchaseOrder.company_id`
-- es `uuid` y `companies.id` es `text` (no se puede). El aislamiento lo hace el
-- codigo con `.eq('company_id', ...)` + `contextoDeEmpresa`, como en el resto del
-- modulo.
--
-- Idempotente (comprueba las FK POR COLUMNAS, no por nombre) y con post-check que
-- ABORTA si alguna FK no quedo. Correr en el SQL Editor; revisa el post-check:
--   RAISE NOTICE '052: listo'

BEGIN;

DO $$
DECLARE
  v_fk_supplier    boolean;
  v_fk_items       boolean;
  v_post_supplier  boolean;
  v_post_items     boolean;
BEGIN
  -- Preflight: sin las tablas, abortar con el detalle (no crear nada).
  IF to_regclass('public."PurchaseOrder"') IS NULL THEN
    RAISE EXCEPTION '052: falta la tabla "PurchaseOrder"';
  END IF;
  IF to_regclass('public."PurchaseOrderItem"') IS NULL THEN
    RAISE EXCEPTION '052: falta la tabla "PurchaseOrderItem"';
  END IF;
  IF to_regclass('public."Supplier"') IS NULL THEN
    RAISE EXCEPTION '052: falta la tabla "Supplier"';
  END IF;

  -- Existe una FK de PurchaseOrder.supplier_id -> Supplier.id?
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'public."PurchaseOrder"'::regclass
      AND c.confrelid = 'public."Supplier"'::regclass
      AND a.attname = 'supplier_id'
  ) INTO v_fk_supplier;

  IF NOT v_fk_supplier THEN
    ALTER TABLE "PurchaseOrder"
      ADD CONSTRAINT "PurchaseOrder_supplier_id_fkey"
      FOREIGN KEY (supplier_id) REFERENCES "Supplier"(id);
    RAISE NOTICE '052: creada FK PurchaseOrder.supplier_id -> Supplier.id';
  ELSE
    RAISE NOTICE '052: la FK PurchaseOrder.supplier_id ya existia';
  END IF;

  -- Existe una FK de PurchaseOrderItem.purchase_order_id -> PurchaseOrder.id?
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'public."PurchaseOrderItem"'::regclass
      AND c.confrelid = 'public."PurchaseOrder"'::regclass
      AND a.attname = 'purchase_order_id'
  ) INTO v_fk_items;

  IF NOT v_fk_items THEN
    ALTER TABLE "PurchaseOrderItem"
      ADD CONSTRAINT "PurchaseOrderItem_purchase_order_id_fkey"
      FOREIGN KEY (purchase_order_id) REFERENCES "PurchaseOrder"(id)
      ON DELETE CASCADE;
    RAISE NOTICE '052: creada FK PurchaseOrderItem.purchase_order_id -> PurchaseOrder.id';
  ELSE
    RAISE NOTICE '052: la FK PurchaseOrderItem.purchase_order_id ya existia';
  END IF;

  -- Post-check: las dos FK deben existir AHORA. Si no, abortar (rollback total).
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'public."PurchaseOrder"'::regclass
      AND c.confrelid = 'public."Supplier"'::regclass
      AND a.attname = 'supplier_id'
  ) INTO v_post_supplier;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'public."PurchaseOrderItem"'::regclass
      AND c.confrelid = 'public."PurchaseOrder"'::regclass
      AND a.attname = 'purchase_order_id'
  ) INTO v_post_items;

  IF NOT v_post_supplier THEN
    RAISE EXCEPTION '052: post-check: no quedo la FK PurchaseOrder.supplier_id';
  END IF;
  IF NOT v_post_items THEN
    RAISE EXCEPTION '052: post-check: no quedo la FK PurchaseOrderItem.purchase_order_id';
  END IF;

  RAISE NOTICE '052: listo (supplier -> % , items -> %)',
    (CASE WHEN v_post_supplier THEN 'ok' ELSE 'falta' END),
    (CASE WHEN v_post_items THEN 'ok' ELSE 'falta' END);
END $$;

COMMIT;