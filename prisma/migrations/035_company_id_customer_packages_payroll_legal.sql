-- ============================================================================
-- 035 - company_id en Customer / CustomerFiles / Packages / PackageProducts /
--       payroll_details / legal_revisiones_historial  +  payroll_config a nivel
--       empresa  +  unique_code_tenant -> (code, company_id)
-- ----------------------------------------------------------------------------
-- PENDIENTE DE APLICAR EN EL SQL EDITOR DE SUPABASE. No lo aplica el asistente.
--
-- Que hace, y por que:
--
--   1. `CustomersComplete`, `CustomersWithFiles`, `CustomersWithRetentions`,
--      `PackageDetails` y las vistas de payroll/legal no pueden aislarse por
--      empresa porque sus tablas base no tienen `company_id`. Esta migracion se
--      lo pone a las seis tablas que el usuario aprobo:
--        Customer, CustomerFiles, Packages, PackageProducts,
--        payroll_details, legal_revisiones_historial
--
--   2. `payroll_config.tenant_id` es UNIQUE, o sea que "test 1" y "test 2"
--      (mismo tenant TEST1DS) comparten una sola configuracion y la ruta se
--      pelea: el GET filtra por company_id y el upsert chocaba por tenant_id.
--      Pasa a ser unica por empresa.
--
--   3. `unique_code_tenant` es `UNIQUE (code, tenant_id)`: por tenant, no por
--      empresa. Como TEST1DS tiene dos empresas, no pueden tener las dos una
--      `1101`. La invariante correcta es `(code, company_id)`.
--
-- Tipos (regla dura): `company_id` es `text` porque apunta a `companies.id`.
--   Backfill: se usa el tenant SOLO cuando ese tenant tiene UNA sola empresa
--   (unico caso ambiguo real: TEST1DS, con "test 1" y "test 2"). Las filas de
--   un tenant con 2+ empresas quedan en NULL y se avisan por NOTICE; nunca se
--   adivina.
--
-- Datos medidos antes de escribir (1 Oct 2026):
--   Customer = 0 filas, CustomerFiles = 0, legal_revisiones_historial = 0
--   Packages = 2 (tenant '1' -> Empresa 1), PackageProducts = 3
--   payroll_details = 15 (empleados de Angelos)
--   payroll_config = 1 fila (tenant ANGELOH7, company_id ya puesto)
--   un solo tenant con 2 empresas: TEST1DS
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Preflight: company_id debe ser text (companies.id es text)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  SELECT data_type INTO t
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'id';

  IF t IS NULL THEN
    RAISE EXCEPTION '035: no existe public.companies.id';
  END IF;
  IF t <> 'text' THEN
    RAISE EXCEPTION '035: companies.id es % (se esperaba text). Revisar antes de seguir.', t;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. Añadir company_id a las seis tablas (idempotente, tipo text)
-- ----------------------------------------------------------------------------
ALTER TABLE public."Customer"                    ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public."CustomerFiles"               ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public."Packages"                    ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public."PackageProducts"             ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.payroll_details               ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.legal_revisiones_historial    ADD COLUMN IF NOT EXISTS company_id text;

-- ----------------------------------------------------------------------------
-- 2. Backfill
-- ----------------------------------------------------------------------------
-- 2a. Mapeo tenant -> empresa SOLO cuando el tenant tiene una sola empresa.
-- 2b. Directo por el tenant de la fila (Customer, CustomerFiles, Packages).
DO $$
DECLARE
  n int;
BEGIN
  WITH unica AS (
    SELECT tenant_id, min(id) AS company_id
    FROM public.companies
    GROUP BY tenant_id
    HAVING count(*) = 1
  )
  UPDATE public."Customer" c SET company_id = u.company_id
  FROM unica u
  WHERE c.company_id IS NULL AND c.tenantid = u.tenant_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '035: Customer backfill = % filas', n;

  WITH unica AS (
    SELECT tenant_id, min(id) AS company_id
    FROM public.companies
    GROUP BY tenant_id
    HAVING count(*) = 1
  )
  UPDATE public."CustomerFiles" f SET company_id = u.company_id
  FROM unica u
  WHERE f.company_id IS NULL AND f.tenantid = u.tenant_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '035: CustomerFiles backfill = % filas', n;

  WITH unica AS (
    SELECT tenant_id, min(id) AS company_id
    FROM public.companies
    GROUP BY tenant_id
    HAVING count(*) = 1
  )
  UPDATE public."Packages" p SET company_id = u.company_id
  FROM unica u
  WHERE p.company_id IS NULL AND p.tenantid = u.tenant_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '035: Packages backfill = % filas', n;
END $$;

-- 2c. CustomerFiles: las que heredan del cliente (por si el tenant era ambiguo).
UPDATE public."CustomerFiles" f SET company_id = c.company_id
FROM public."Customer" c
WHERE f.company_id IS NULL AND f.customerid = c.id AND c.company_id IS NOT NULL;

-- 2d. PackageProducts: hereda de su paquete (Packages ya tiene company_id).
UPDATE public."PackageProducts" pp SET company_id = p.company_id
FROM public."Packages" p
WHERE pp.company_id IS NULL AND pp.packageid = p.id AND p.company_id IS NOT NULL;

-- 2e. payroll_details: hereda del empleado (employees.company_id es confiable;
--     payroll_periods.company_id trae basura: 'COMP001', 'demo-company-id').
UPDATE public.payroll_details d SET company_id = e.company_id
FROM public.employees e
WHERE d.company_id IS NULL AND d.employee_id = e.id AND e.company_id IS NOT NULL;

-- 2f. legal_revisiones_historial: hereda de la revision (que SI tiene company_id).
UPDATE public.legal_revisiones_historial h SET company_id = r.company_id
FROM public.legal_revisiones r
WHERE h.company_id IS NULL AND h.revision_id = r.id AND r.company_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. Indices por empresa
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customer_company            ON public."Customer" (company_id);
CREATE INDEX IF NOT EXISTS idx_customerfiles_company       ON public."CustomerFiles" (company_id);
CREATE INDEX IF NOT EXISTS idx_packages_company            ON public."Packages" (company_id);
CREATE INDEX IF NOT EXISTS idx_packageproducts_company     ON public."PackageProducts" (company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_details_company     ON public.payroll_details (company_id);
CREATE INDEX IF NOT EXISTS idx_legal_rev_hist_company      ON public.legal_revisiones_historial (company_id);

-- ----------------------------------------------------------------------------
-- 4. Rebuild de vistas que dependen de las tablas base
-- ----------------------------------------------------------------------------
-- 4a. "PackageDetails" (definicion vigente en 008_consolidate_inventory_schema).
--     Se recrea AÑADIENDO company_id AL FINAL: CREATE OR REPLACE VIEW solo
--     permite anadir columnas al final. Si la vista viva tiene otra forma, se
--     avisa y se omite en vez de reventar.
DO $$
DECLARE
  v_def text;
BEGIN
  IF to_regclass('public."PackageDetails"') IS NULL THEN
    RAISE NOTICE '035: "PackageDetails" no existe, se omite';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'PackageDetails' AND column_name = 'company_id'
  ) THEN
    RAISE NOTICE '035: "PackageDetails" ya expone company_id, se omite';
    RETURN;
  END IF;

  v_def := pg_get_viewdef('public."PackageDetails"'::regclass, true);
  EXECUTE format(
    'CREATE OR REPLACE VIEW public."PackageDetails" AS '
    'SELECT base.*, (SELECT p.company_id FROM public."Packages" p WHERE p.id = base.id) AS company_id '
    'FROM (%s) base',
    v_def
  );
  RAISE NOTICE '035: "PackageDetails" recreada con company_id';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '035: no se pudo recrear "PackageDetails" (%): se deja como estaba', SQLERRM;
END $$;

-- 4b. CustomersComplete / CustomersWithFiles / CustomersWithRetentions: su DDL
--     no esta en el repo y hoy tienen 0 filas (Customer y CustomerFiles estan
--     vacias). Se avisan; no se tocan para no romper su forma.
DO $$
DECLARE
  v text;
BEGIN
  FOREACH v IN ARRAY ARRAY['CustomersComplete','CustomersWithFiles','CustomersWithRetentions'] LOOP
    IF to_regclass(format('public.%I', v)) IS NULL THEN
      RAISE NOTICE '035: %.% no existe', 'public', v;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v AND column_name = 'company_id'
    ) THEN
      RAISE NOTICE '035: %.% ya expone company_id', 'public', v;
    ELSE
      RAISE NOTICE '035: %.% existe pero NO expone company_id. Hay que recrearla a mano (su DDL no esta en el repo).', 'public', v;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. payroll_config: de nivel tenant a nivel empresa
-- ----------------------------------------------------------------------------
-- 5a. Quitar el UNIQUE de tenant_id (constraint o indice, cualquiera que sea).
ALTER TABLE public.payroll_config DROP CONSTRAINT IF EXISTS payroll_config_tenant_id_key;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT ic.relname AS idx_name
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace ns ON ns.oid = tc.relnamespace
    WHERE ns.nspname = 'public'
      AND tc.relname = 'payroll_config'
      AND i.indisunique
      AND i.indnkeyatts = 1
      AND pg_get_indexdef(i.indexrelid, 1, true) = 'tenant_id'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.idx_name);
    RAISE NOTICE '035: payroll_config - indice unico sobre tenant_id "%" eliminado', r.idx_name;
  END LOOP;
END $$;

-- 5b. company_id debe existir y estar puesto en la fila existente.
ALTER TABLE public.payroll_config ADD COLUMN IF NOT EXISTS company_id text;

UPDATE public.payroll_config pc SET company_id = u.company_id
FROM (
  SELECT tenant_id, min(id) AS company_id
  FROM public.companies
  GROUP BY tenant_id
  HAVING count(*) = 1
) u
WHERE pc.company_id IS NULL AND pc.tenant_id = u.tenant_id;

-- 5c. Unico por empresa (full unique: ON CONFLICT (company_id) de PostgREST no
--     admite indices parciales).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class ic
    JOIN pg_namespace ns ON ns.oid = ic.relnamespace
    WHERE ns.nspname = 'public' AND ic.relname = 'payroll_config_company_id_key'
  ) THEN
    ALTER TABLE public.payroll_config ADD CONSTRAINT payroll_config_company_id_key UNIQUE (company_id);
    RAISE NOTICE '035: payroll_config - creado UNIQUE (company_id)';
  ELSE
    RAISE NOTICE '035: payroll_config - UNIQUE (company_id) ya existia';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. unique_code_tenant -> (code, company_id)
-- ----------------------------------------------------------------------------
-- 6a. Preflight de duplicados que el indice nuevo crearia.
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM (
    SELECT company_id, code
    FROM public."Account"
    GROUP BY company_id, code
    HAVING count(*) > 1
  ) d;
  IF n > 0 THEN
    RAISE EXCEPTION '035: hay % duplicados de (company_id, code) en "Account"; resolverlos antes', n;
  END IF;
END $$;

-- 6b. Quitar el unico por tenant.
ALTER TABLE public."Account" DROP CONSTRAINT IF EXISTS "unique_code_tenant";
DROP INDEX IF EXISTS public."unique_code_tenant";

-- 6c. Crear el unico por empresa (los NULL cuentan como distintos, asi que las
--     8 cuentas legacy sin company_id no colisionan).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class ic
    JOIN pg_namespace ns ON ns.oid = ic.relnamespace
    WHERE ns.nspname = 'public' AND ic.relname = 'Account_company_id_code_key'
  ) THEN
    CREATE UNIQUE INDEX "Account_company_id_code_key" ON public."Account" ("company_id", code);
    RAISE NOTICE '035: "Account" - creado UNIQUE (company_id, code)';
  ELSE
    RAISE NOTICE '035: "Account" - UNIQUE (company_id, code) ya existia';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7. Post-checks (lo que quedo sin atribuir, con detalle)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT 'Customer' AS t, count(*) FILTER (WHERE company_id IS NULL) AS nulos, count(*) AS total FROM public."Customer"
    UNION ALL SELECT 'CustomerFiles', count(*) FILTER (WHERE company_id IS NULL), count(*) FROM public."CustomerFiles"
    UNION ALL SELECT 'Packages', count(*) FILTER (WHERE company_id IS NULL), count(*) FROM public."Packages"
    UNION ALL SELECT 'PackageProducts', count(*) FILTER (WHERE company_id IS NULL), count(*) FROM public."PackageProducts"
    UNION ALL SELECT 'payroll_details', count(*) FILTER (WHERE company_id IS NULL), count(*) FROM public.payroll_details
    UNION ALL SELECT 'legal_revisiones_historial', count(*) FILTER (WHERE company_id IS NULL), count(*) FROM public.legal_revisiones_historial
    UNION ALL SELECT 'payroll_config', count(*) FILTER (WHERE company_id IS NULL), count(*) FROM public.payroll_config
  LOOP
    IF r.nulos > 0 THEN
      RAISE NOTICE '035: PENDIENTE % -> %/% filas sin company_id', r.t, r.nulos, r.total;
    ELSE
      RAISE NOTICE '035: OK % -> %/% con company_id', r.t, r.total, r.total;
    END IF;
  END LOOP;
END $$;

COMMIT;
