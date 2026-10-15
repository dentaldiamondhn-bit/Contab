-- 060_purchase_returns.sql
-- Devoluciones a proveedores (8 Oct 2026).
--
-- El modulo de Compras no tenia forma de registrar una devolucion: una compra
-- se corrigia a mano (editar/borrar) y no quedaba rastro del motivo ni del
-- efecto en inventario y contabilidad. Este cambio modela la devolucion como un
-- documento propio, ligado a la compra de origen:
--   * "PurchaseReturn"      -> cabecera: compra de origen, proveedor, motivo,
--                              tipo de reembolso e importes.
--   * "PurchaseReturnItem"  -> lineas: cuanto se devuelve por producto.
-- Cada devolucion BAJA stock del producto (inverso de `createPurchase`) y crea
-- un asiento de reversa (nota de credito), best-effort, igual que la compra.
--
-- Tipos (medidos, ver 052): `Supplier.id` es `uuid` y `product.id` es `uuid`.
-- `Purchase.id` y `PurchaseItem.id` no tienen tipo garantizado (la 059 ya lo
-- dejo fuera del FK por eso), asi que `purchase_id` / `purchase_item_id` se
-- guardan como `text` SIN FK. `company_id` es `text` (apunta a `companies.id`,
-- que es text) y tampoco lleva FK: el aislamiento lo hace el codigo con
-- `.eq('company_id', ...)` + `contextoDeEmpresa`, como en todo el modulo.
--
-- Idempotente (IF NOT EXISTS / to_regclass) y con post-check que ABORTA si algo
-- no quedo. Correr en el SQL Editor y mirar el final:
--   RAISE NOTICE '060: listo'

BEGIN;

DO $$
BEGIN
  -- Preflight: sin las tablas de Compras no hay a que ligar la devolucion.
  IF to_regclass('public."Purchase"') IS NULL THEN
    RAISE EXCEPTION '060: falta la tabla "Purchase"';
  END IF;
  IF to_regclass('public."PurchaseItem"') IS NULL THEN
    RAISE EXCEPTION '060: falta la tabla "PurchaseItem"';
  END IF;

  -- Cabecera de la devolucion.
  IF to_regclass('public."PurchaseReturn"') IS NULL THEN
    CREATE TABLE "PurchaseReturn" (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      purchase_id       text NOT NULL,
      company_id        text NOT NULL,
      tenant_id         text,
      supplier_id       uuid,
      invoice_number    text,
      return_number     text,
      return_date       date,
      return_type       text DEFAULT 'credit',
      reason            text,
      notes             text,
      subtotal          bigint NOT NULL DEFAULT 0,
      tax_amount        bigint NOT NULL DEFAULT 0,
      total             bigint NOT NULL DEFAULT 0,
      journal_entry_id  text,
      created_at        timestamptz DEFAULT now(),
      updated_at        timestamptz DEFAULT now()
    );
    RAISE NOTICE '060: creada "PurchaseReturn"';
  ELSE
    RAISE NOTICE '060: "PurchaseReturn" ya existia';
  END IF;

  -- Lineas de la devolucion.
  IF to_regclass('public."PurchaseReturnItem"') IS NULL THEN
    CREATE TABLE "PurchaseReturnItem" (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      return_id        uuid NOT NULL REFERENCES "PurchaseReturn"(id) ON DELETE CASCADE,
      company_id       text NOT NULL,
      tenant_id        text,
      purchase_item_id text,
      product_id       uuid,
      product_name     text,
      quantity         numeric NOT NULL DEFAULT 0,
      unit_price       bigint NOT NULL DEFAULT 0,
      tax_rate         numeric DEFAULT 15,
      subtotal         bigint NOT NULL DEFAULT 0,
      tax_amount       bigint NOT NULL DEFAULT 0,
      total            bigint NOT NULL DEFAULT 0,
      created_at       timestamptz DEFAULT now()
    );
    RAISE NOTICE '060: creada "PurchaseReturnItem"';
  ELSE
    RAISE NOTICE '060: "PurchaseReturnItem" ya existia';
  END IF;

  -- Indices idempotentes.
  CREATE INDEX IF NOT EXISTS idx_purchase_return_purchase  ON "PurchaseReturn"(purchase_id);
  CREATE INDEX IF NOT EXISTS idx_purchase_return_company   ON "PurchaseReturn"(company_id);
  CREATE INDEX IF NOT EXISTS idx_purchase_return_supplier  ON "PurchaseReturn"(company_id, supplier_id);
  CREATE INDEX IF NOT EXISTS idx_purchase_return_item_ret  ON "PurchaseReturnItem"(return_id);

  -- Igual que el resto del modulo: RLS activado y politica para service_role
  -- (la app usa service_role, que salta el RLS; esto cierra el acceso anon).
  ALTER TABLE "PurchaseReturn" ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Allow all for service_role on PurchaseReturn" ON "PurchaseReturn";
  CREATE POLICY "Allow all for service_role on PurchaseReturn" ON "PurchaseReturn"
    FOR ALL USING (auth.role() = 'service_role');
  GRANT ALL ON "PurchaseReturn" TO service_role;

  ALTER TABLE "PurchaseReturnItem" ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Allow all for service_role on PurchaseReturnItem" ON "PurchaseReturnItem";
  CREATE POLICY "Allow all for service_role on PurchaseReturnItem" ON "PurchaseReturnItem"
    FOR ALL USING (auth.role() = 'service_role');
  GRANT ALL ON "PurchaseReturnItem" TO service_role;

  -- Post-check: tablas y la FK hija->padre deben existir AHORA (si no, rollback).
  IF to_regclass('public."PurchaseReturn"') IS NULL THEN
    RAISE EXCEPTION '060: post-check: falta "PurchaseReturn"';
  END IF;
  IF to_regclass('public."PurchaseReturnItem"') IS NULL THEN
    RAISE EXCEPTION '060: post-check: falta "PurchaseReturnItem"';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'public."PurchaseReturnItem"'::regclass
      AND c.confrelid = 'public."PurchaseReturn"'::regclass
      AND a.attname = 'return_id'
  ) THEN
    RAISE EXCEPTION '060: post-check: falta la FK PurchaseReturnItem.return_id';
  END IF;

  RAISE NOTICE '060: listo';
END $$;

COMMIT;
