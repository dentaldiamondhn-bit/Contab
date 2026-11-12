-- ============================================================================
-- 037 - "PackageDetails": anadir company_id (la 035 no pudo y lo oculto)
-- ----------------------------------------------------------------------------
-- PENDIENTE DE APLICAR EN EL SQL EDITOR DE SUPABASE.
--
-- La 035 intentaba recrear "PackageDetails" anadiendo company_id con
-- `pg_get_viewdef(..., true)`. Esa funcion devuelve la definicion con un `;`
-- FINAL, asi que `FROM (%s) base` quedaba `FROM (SELECT ...;) base` ->
-- "syntax error at or near ;". Como el bloque tenia `EXCEPTION WHEN OTHERS`,
-- el fallo se trago y solo salio un RAISE NOTICE: "Success. No rows returned".
-- Medido despues de aplicar la 035: "PackageDetails" seguia SIN company_id.
--
-- Esta migracion:
--   1. quita el `;` final antes de envolver la definicion (causa raiz);
--   2. NO traga excepciones: si vuelve a fallar, aborta y el SQL Editor lo dice;
--   3. reescribe security_invoker (lo puso RLS_ALL_TABLES_V3 y CREATE OR REPLACE
--      puede perder las reloptions);
--   4. post-check que EXIGE la columna company_id.
--
-- Nota: "PackageDetails" no tiene consumidores en `app/` ni `lib/` (solo SQL y
-- docs). Es de baja prioridad, pero el usuario aprobo meterla en el alcance.
-- Las 3 vistas CustomersComplete/CustomersWithFiles/CustomersWithRetentions
-- siguen sin company_id a proposito: su DDL no esta en el repo y hoy tienen 0
-- filas.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_def text;
BEGIN
  IF to_regclass('public."PackageDetails"') IS NULL THEN
    RAISE NOTICE '037: "PackageDetails" no existe, se omite';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'PackageDetails' AND column_name = 'company_id'
  ) THEN
    RAISE NOTICE '037: "PackageDetails" ya expone company_id, se omite';
    RETURN;
  END IF;

  v_def := pg_get_viewdef('public."PackageDetails"'::regclass, true);
  -- pg_get_viewdef(..., true) termina en ';': sin quitarlo, meter la definicion
  -- entre parentesis da error de sintaxis. Esta es la causa de que la 035 fallara.
  v_def := regexp_replace(v_def, ';+\s*$', '');

  EXECUTE format(
    'CREATE OR REPLACE VIEW public."PackageDetails" AS '
    'SELECT base.*, (SELECT p.company_id FROM public."Packages" p WHERE p.id = base.id) AS company_id '
    'FROM (%s) base',
    v_def
  );
  RAISE NOTICE '037: "PackageDetails" recreada con company_id';
END $$;

-- security_invoker (lo puso RLS_ALL_TABLES_V3).
DO $$
BEGIN
  IF to_regclass('public."PackageDetails"') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."PackageDetails" SET (security_invoker = true)';
  END IF;
END $$;

-- Post-check: la columna DEBE existir; y avisa de filas sin atribuir.
DO $$
DECLARE
  n_col   int;
  n_nulos int;
  n_total int;
BEGIN
  SELECT count(*) INTO n_col FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'PackageDetails' AND column_name = 'company_id';
  IF n_col = 0 THEN
    RAISE EXCEPTION '037: "PackageDetails" sigue sin company_id';
  END IF;

  SELECT count(*) FILTER (WHERE company_id IS NULL), count(*) INTO n_nulos, n_total
  FROM public."PackageDetails";
  IF n_nulos > 0 THEN
    RAISE NOTICE '037: PENDIENTE PackageDetails -> %/% filas sin company_id', n_nulos, n_total;
  ELSE
    RAISE NOTICE '037: OK PackageDetails -> %/% con company_id', n_total, n_total;
  END IF;
END $$;

COMMIT;
