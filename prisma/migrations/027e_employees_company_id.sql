-- =============================================================================
-- 027e_employees_company_id.sql
--
-- Repara `employees.company_id`, que hoy vale 'demo-company-id' en las 49
-- filas. No es un `companies.id`: no corresponde a ninguna empresa real. Por eso
-- las rutas de RRHH devuelven 0 filas tanto si filtran por `tenant_id` con el
-- `[id]` de la ruta (que es un `companies.id`) como si empiezan a filtrar bien
-- por `company_id`. Aislar el filtro sin arreglar esto solo produce un 400/0
-- con mejor estilo.
--
-- MEDIDO antes de escribir esto (PostgREST, solo lectura):
--
--   tabla            filas  company_id                            tenant_id
--   employees           49  {"demo-company-id": 49}               {ANGELOH7: 48, NULL: 1}
--   departments          7  7bd123d8-... (Angelos) 7/7 reales   ANGELOH7
--   positions           25  7bd123d8-... (Angelos) 25/25 reales ANGELOH7
--   work_schedules       1  7bd123d8-... (Angelos) 1/1 real    ANGELOH7
--
-- Las otras tres tablas de RRHH SI tienen `company_id` correcto, asi que el
-- dato de `employees` es un backfill que se coló con un placeholder y nadie
-- revisó. `departments`/`positions`/`work_schedules` confirman que Angelos
-- (`7bd123d8-40fa-4383-93a4-d87e37b0ce3f`) es la empresa de este tenant.
--
-- LA FILA SIN TENANT NO SE ADIVINA:
--   Hay 1 fila con `tenant_id` NULL. No tiene ningun dato de empresa, asi que se
--   deja fuera en vez de atribuírsela a Angelos. Ponerla en Angelos la haria
--   visible para Angelos siendo un empleado sin empresa, que es peor que que no
--   aparezca. Si el usuario sabe de quien es, se corrige a mano.
--
-- Por que NO se copia desde `departments`: las 49 filas comparten el mismo
-- placeholder, y `employees.position_id`/`department` apuntan a filas de
-- Angelos, pero eso no prueba que TODOS los empleados sean de Angelos. Se usa
-- el `tenant_id` de la propia fila, que es la unica evidencia directa, y solo
-- cuando ese tenant tiene exactamente UNA empresa. Con mas de una, el UPDATE no
-- toca la fila y se avisa, en vez de elegir una.
--
-- Idempotente. Sin cambios de esquema.
-- =============================================================================

-- ---- Bloque 0: preflight. Aborta antes de escribir si el supuesto no vale. ----
DO $$
DECLARE
  n_bad        integer;
  n_resolved   integer;
  n_ambiguous  integer;
BEGIN
  -- 0a. La tabla tiene que existir con las dos columnas.
  IF to_regclass(format('public.%I', 'employees')) IS NULL THEN
    RAISE EXCEPTION 'No existe la tabla public.employees';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='employees' AND column_name='company_id'
  ) THEN
    RAISE EXCEPTION 'employees no tiene columna company_id';
  END IF;

  -- 0b. Cuantas filas tienen el placeholder sucio.
  SELECT count(*) INTO n_bad
  FROM employees
  WHERE company_id IS DISTINCT FROM NULL
    AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = employees.company_id);

  -- 0c. De esas, cuantas se pueden atribuir con certeza (su tenant_id resuelve
  --     a una unica empresa) y cuantas son ambiguas.
  SELECT count(*) INTO n_resolved
  FROM employees e
  WHERE e.company_id IS DISTINCT FROM NULL
    AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = e.company_id)
    AND e.tenant_id IS NOT NULL
    AND (SELECT count(*) FROM companies c2 WHERE c2.tenant_id = e.tenant_id) = 1;

  SELECT count(*) INTO n_ambiguous
  FROM employees e
  WHERE e.company_id IS DISTINCT FROM NULL
    AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = e.company_id)
    AND e.tenant_id IS NOT NULL
    AND (SELECT count(*) FROM companies c2 WHERE c2.tenant_id = e.tenant_id) > 1;

  RAISE NOTICE 'employees con company_id invalido: %', n_bad;
  RAISE NOTICE '  atribuibles con certeza (tenant con 1 sola empresa): %', n_resolved;
  RAISE NOTICE '  ambiguas (tenant con >1 empresa), NO se tocan:        %', n_ambiguous;
  RAISE NOTICE '  sin tenant_id, quedan sin empresa:                     %',
    (SELECT count(*) FROM employees e
     WHERE e.company_id IS DISTINCT FROM NULL
       AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = e.company_id)
       AND e.tenant_id IS NULL);

  -- 0d. Si TODAS las filas sucias son ambiguas, el metodo no vale para nada.
  --     Abortar aqui es mejor que dejar 49 filas sin atribuir en silencio.
  IF n_bad > 0 AND n_resolved = 0 THEN
    RAISE EXCEPTION
      'Ninguna fila de employees se puede atribuir por tenant_id: revisa el metodo antes de seguir';
  END IF;
END $$;


-- ---- Bloque 1: la reparacion. Solo filas cuya empresa se deduce sin ambiguedad. ----
WITH resoluble AS (
  SELECT e.id, min(c.id) AS empresa_id
  FROM employees e
  JOIN companies c ON c.tenant_id = e.tenant_id
  WHERE e.company_id IS DISTINCT FROM NULL
    AND NOT EXISTS (SELECT 1 FROM companies c2 WHERE c2.id = e.company_id)
    AND e.tenant_id IS NOT NULL
  GROUP BY e.id
  HAVING count(*) = 1          -- una sola empresa para ese tenant
), reparadas AS (
  UPDATE employees e
  SET company_id = r.empresa_id
  FROM resoluble r
  WHERE e.id = r.id
  RETURNING e.id
)
SELECT count(*) AS reparadas
FROM reparadas;


-- ---- Bloque 2: informe de lo que queda sin empresa. ----
DO $$
DECLARE
  pendientes integer;
BEGIN
  SELECT count(*) INTO pendientes
  FROM employees
  WHERE company_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = employees.company_id);

  IF pendientes > 0 THEN
    RAISE WARNING
      'Quedan % fila(s) de employees sin company_id valido. NO aparecen en las pantallas de RRHH, que es lo correcto: antes se attributrian a una empresa que no es la suya.',
      pendientes;
  END IF;

  -- El estado final que hay que comprobar a mano.
  RAISE NOTICE 'Reparto final de employees por empresa:';
END $$;

-- Para verlo, ejecuta a mano despues de aplicar:
--
--   SELECT coalesce(c.name, 'SIN EMPRESA ('||e.company_id||')') AS empresa,
--          count(*) AS empleados
--   FROM employees e
--   LEFT JOIN companies c ON c.id = e.company_id
--   GROUP BY 1 ORDER BY 2 DESC;
