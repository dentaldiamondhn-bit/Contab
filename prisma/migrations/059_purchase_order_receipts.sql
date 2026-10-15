-- 059_purchase_order_receipts.sql
-- Recepcion PARCIAL de Ordenes de Compra (8 Oct 2026).
--
-- Antes "Recibir" (047/052) recibia la orden ENTERA de una sola vez: exigia
-- `status = 'APPROVED'` y `purchase_id IS NULL`, marcaba `RECEIVED` y creaba
-- UNA compra con el total de la orden. No habia forma de registrar entregas
-- parciales ni una segunda factura, y no quedaba rastro de que se recibio, de
-- quien ni con que factura (solo el ultimo `purchase_id` en la cabecera).
--
-- Este cambio modela una recepcion por entrega:
--   * "PurchaseOrderReceipt"      -> cabecera: factura, fecha, quien recibe.
--   * "PurchaseOrderReceiptItem"  -> lineas: cuanto se recibio por producto.
-- Cada recepcion crea su propia `Purchase` (factura) y suma
-- `PurchaseOrderItem.quantity_received`. La orden pasa a `PARTIALLY_RECEIVED`
-- mientras falte algo y a `RECEIVED` cuando cada linea esta completa.
--
-- Tipos (medidos, ver 052): `PurchaseOrder.id uuid` y `PurchaseOrderItem`
-- `purchase_order_id uuid`, asi que la FK de la cabecera va en `uuid`. Las
-- tablas hijas nacen con el mismo `uuid`/`gen_random_uuid()`.
--
-- Aislamiento: NO hay FK de `company_id` (apunta a `companies.id`, que es
-- `text`, y aqui se guarda como `text` igual que en el resto del modulo). El
-- aislamiento lo hace el codigo con `.eq('company_id', ...)` +
-- `contextoDeEmpresa`, como en todo el modulo. `purchase_id` se guarda como
-- `text` (sin FK) por la misma razon: no se puede garantizar el tipo de
-- `Purchase.id` y no es una relacion que la base tenga que validar.
--
-- Idempotente (IF NOT EXISTS / to_regclass) y con post-check que ABORTA si algo
-- no quedo. Correr en el SQL Editor y mirar el final:
--   RAISE NOTICE '059: listo'

BEGIN;

DO $$
DECLARE
  v_check record;
BEGIN
  -- Preflight: sin las tablas del modulo, abortar con el detalle (no crear nada).
  IF to_regclass('public."PurchaseOrder"') IS NULL THEN
    RAISE EXCEPTION '059: falta la tabla "PurchaseOrder"';
  END IF;
  IF to_regclass('public."PurchaseOrderItem"') IS NULL THEN
    RAISE EXCEPTION '059: falta la tabla "PurchaseOrderItem"';
  END IF;

  -- El estado nuevo `PARTIALLY_RECEIVED` es texto libre en la columna. Si la
  -- tabla tuviera un CHECK sobre `status` (no lo tiene hoy; MASTER_SETUP lo crea
  -- como TEXT DEFAULT 'DRAFT' sin CHECK), lo quitamos para que no bloquee el
  -- nuevo valor. Se avisa por NOTICE.
  FOR v_check IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public."PurchaseOrder"'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE "PurchaseOrder" DROP CONSTRAINT %I', v_check.conname);
    RAISE NOTICE '059: quitado CHECK % de PurchaseOrder.status', v_check.conname;
  END LOOP;

  -- Cabecera de recepcion.
  IF to_regclass('public."PurchaseOrderReceipt"') IS NULL THEN
    CREATE TABLE "PurchaseOrderReceipt" (
      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      purchase_order_id  uuid NOT NULL REFERENCES "PurchaseOrder"(id) ON DELETE CASCADE,
      company_id         text NOT NULL,
      tenant_id          text,
      invoice_number     text NOT NULL,
      invoice_date       date,
      cai                text,
      purchase_id        text,
      received_at        timestamptz,
      received_by        text,
      notes              text,
      created_at         timestamptz DEFAULT now()
    );
    RAISE NOTICE '059: creada "PurchaseOrderReceipt"';
  ELSE
    RAISE NOTICE '059: "PurchaseOrderReceipt" ya existia';
  END IF;

  -- Lineas de la recepcion.
  IF to_regclass('public."PurchaseOrderReceiptItem"') IS NULL THEN
    CREATE TABLE "PurchaseOrderReceiptItem" (
      id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      receipt_id             uuid NOT NULL REFERENCES "PurchaseOrderReceipt"(id) ON DELETE CASCADE,
      company_id             text NOT NULL,
      tenant_id              text,
      purchase_order_item_id uuid,
      product_id             uuid,
      product_name           text,
      quantity_received      numeric NOT NULL DEFAULT 0,
      unit_price             bigint NOT NULL DEFAULT 0,
      total                  bigint NOT NULL DEFAULT 0,
      created_at             timestamptz DEFAULT now()
    );
    RAISE NOTICE '059: creada "PurchaseOrderReceiptItem"';
  ELSE
    RAISE NOTICE '059: "PurchaseOrderReceiptItem" ya existia';
  END IF;

  -- Indices idempotentes.
  CREATE INDEX IF NOT EXISTS idx_po_receipt_order   ON "PurchaseOrderReceipt"(purchase_order_id);
  CREATE INDEX IF NOT EXISTS idx_po_receipt_company ON "PurchaseOrderReceipt"(company_id);
  CREATE INDEX IF NOT EXISTS idx_po_receipt_item_receipt ON "PurchaseOrderReceiptItem"(receipt_id);

  -- Igual que el resto del modulo: RLS activado y politica para service_role
  -- (la app usa service_role, que salta el RLS; esto cierra el acceso anon).
  ALTER TABLE "PurchaseOrderReceipt" ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Allow all for service_role on PurchaseOrderReceipt" ON "PurchaseOrderReceipt";
  CREATE POLICY "Allow all for service_role on PurchaseOrderReceipt" ON "PurchaseOrderReceipt"
    FOR ALL USING (auth.role() = 'service_role');
  GRANT ALL ON "PurchaseOrderReceipt" TO service_role;

  ALTER TABLE "PurchaseOrderReceiptItem" ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Allow all for service_role on PurchaseOrderReceiptItem" ON "PurchaseOrderReceiptItem";
  CREATE POLICY "Allow all for service_role on PurchaseOrderReceiptItem" ON "PurchaseOrderReceiptItem"
    FOR ALL USING (auth.role() = 'service_role');
  GRANT ALL ON "PurchaseOrderReceiptItem" TO service_role;

  -- Post-check: tablas y las dos FK deben existir AHORA (si no, rollback total).
  IF to_regclass('public."PurchaseOrderReceipt"') IS NULL THEN
    RAISE EXCEPTION '059: post-check: falta "PurchaseOrderReceipt"';
  END IF;
  IF to_regclass('public."PurchaseOrderReceiptItem"') IS NULL THEN
    RAISE EXCEPTION '059: post-check: falta "PurchaseOrderReceiptItem"';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'public."PurchaseOrderReceipt"'::regclass
      AND c.confrelid = 'public."PurchaseOrder"'::regclass
      AND a.attname = 'purchase_order_id'
  ) THEN
    RAISE EXCEPTION '059: post-check: falta la FK PurchaseOrderReceipt.purchase_order_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'public."PurchaseOrderReceiptItem"'::regclass
      AND c.confrelid = 'public."PurchaseOrderReceipt"'::regclass
      AND a.attname = 'receipt_id'
  ) THEN
    RAISE EXCEPTION '059: post-check: falta la FK PurchaseOrderReceiptItem.receipt_id';
  END IF;

  RAISE NOTICE '059: listo';
END $$;

COMMIT;
