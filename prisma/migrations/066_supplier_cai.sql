-- 066_supplier_cai.sql
--
-- CAI del proveedor: codigo autorizado, fecha limite de emision y rango de
-- facturacion. Son columnas nuevas en "Supplier"; no hay tabla aparte porque,
-- para este alcance, cada proveedor tiene un CAI vigente (si cambia, se
-- actualiza la fila). Sin FK y sin unicidad: la regla del usuario es que
-- NINGUNA unicidad separe empresas (seccion de Proveedores de AGENTS.md).
--
-- Idempotente. Se aplica a mano en el SQL Editor de Supabase.
-- Preflight: la tabla tiene que existir. Post-check: las 4 columnas tienen que
-- quedar puestas, o la migracion aborta (un ADD COLUMN silencioso no se nota).

BEGIN;

DO $$
BEGIN
  IF to_regclass('public."Supplier"') IS NULL THEN
    RAISE EXCEPTION '066: no existe la tabla "Supplier". Aplica primero las migraciones base.';
  END IF;
END $$;

ALTER TABLE public."Supplier" ADD COLUMN IF NOT EXISTS cai text;
ALTER TABLE public."Supplier" ADD COLUMN IF NOT EXISTS cai_expiration_date date;
ALTER TABLE public."Supplier" ADD COLUMN IF NOT EXISTS cai_range_from text;
ALTER TABLE public."Supplier" ADD COLUMN IF NOT EXISTS cai_range_to text;

DO $$
DECLARE
  v_faltan text;
BEGIN
  SELECT string_agg(c.nombre, ', ' ORDER BY c.nombre)
    INTO v_faltan
    FROM (VALUES
            ('cai'),
            ('cai_expiration_date'),
            ('cai_range_from'),
            ('cai_range_to')
         ) AS c(nombre)
   WHERE NOT EXISTS (
     SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Supplier'
        AND column_name = c.nombre
   );

  IF v_faltan IS NOT NULL THEN
    RAISE EXCEPTION '066: faltan columnas en "Supplier": %', v_faltan;
  END IF;

  RAISE NOTICE '066: listo. CAI del proveedor habilitado (cai, cai_expiration_date, cai_range_from, cai_range_to).';
END $$;

COMMIT;
