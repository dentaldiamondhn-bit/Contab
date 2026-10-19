-- 068_compra_retencion_exoneracion.sql
--
-- Retencion ISR del proveedor + exoneracion de ISV en Compras.
--
-- `Supplier.withholding_type`: tipo de retencion configurado en el proveedor
--   ('NONE' | 'ISR_1' | 'ISR_12_5'). Sin tabla aparte y sin unicidad (regla de
--   Proveedores de AGENTS.md): el proveedor tiene un solo tipo vigente.
-- `Purchase.withholding_type` / `withholding_rate` / `withholding_amount`: la
--   retencion efectivamente aplicada a la compra (heredada del proveedor, con
--   override en el formulario). `withholding_amount` es el monto retenido (en
--   lempiras) y reduce lo pagado al proveedor.
-- `Purchase.exonerated`: cabecera derivada, true si alguna linea esta exonerada.
-- `PurchaseItem.exonerated`: la marca real, por linea (permite compras mixtas).
--
-- Sin FK y sin unicidad, como el resto del modulo de Compras (059/060/061/066):
-- el aislamiento lo hace el codigo por `company_id`.
--
-- Idempotente. Se aplica a mano en el SQL Editor de Supabase.
-- Preflight: las 3 tablas tienen que existir. Post-check: las 6 columnas tienen
-- que quedar puestas, o la migracion aborta (un ADD COLUMN silencioso no se nota).

BEGIN;

DO $$
BEGIN
  IF to_regclass('public."Supplier"') IS NULL THEN
    RAISE EXCEPTION '068: no existe la tabla "Supplier". Aplica primero las migraciones base.';
  END IF;
  IF to_regclass('public."Purchase"') IS NULL THEN
    RAISE EXCEPTION '068: no existe la tabla "Purchase". Aplica primero las migraciones base.';
  END IF;
  IF to_regclass('public."PurchaseItem"') IS NULL THEN
    RAISE EXCEPTION '068: no existe la tabla "PurchaseItem". Aplica primero las migraciones base.';
  END IF;
END $$;

ALTER TABLE public."Supplier" ADD COLUMN IF NOT EXISTS withholding_type text;

ALTER TABLE public."Purchase" ADD COLUMN IF NOT EXISTS withholding_type text;
ALTER TABLE public."Purchase" ADD COLUMN IF NOT EXISTS withholding_rate numeric(6,4);
ALTER TABLE public."Purchase" ADD COLUMN IF NOT EXISTS withholding_amount numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public."Purchase" ADD COLUMN IF NOT EXISTS exonerated boolean NOT NULL DEFAULT false;

ALTER TABLE public."PurchaseItem" ADD COLUMN IF NOT EXISTS exonerated boolean NOT NULL DEFAULT false;

DO $$
DECLARE
  v_faltan text;
BEGIN
  SELECT string_agg(c.tabla || '.' || c.nombre, ', ' ORDER BY c.tabla, c.nombre)
    INTO v_faltan
    FROM (VALUES
            ('Supplier', 'withholding_type'),
            ('Purchase', 'withholding_type'),
            ('Purchase', 'withholding_rate'),
            ('Purchase', 'withholding_amount'),
            ('Purchase', 'exonerated'),
            ('PurchaseItem', 'exonerated')
         ) AS c(tabla, nombre)
   WHERE NOT EXISTS (
     SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = c.tabla
        AND column_name = c.nombre
   );

  IF v_faltan IS NOT NULL THEN
    RAISE EXCEPTION '068: faltan columnas: %', v_faltan;
  END IF;

  RAISE NOTICE '068: listo. Retencion del proveedor y exoneracion por linea habilitadas.';
END $$;

COMMIT;
