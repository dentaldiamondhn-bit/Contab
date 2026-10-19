-- 070_test2_plan_cuentas.sql
--
-- APLICADA y verificada el 8 Oct 2026 (SQL Editor -> "Success"; verificado
-- desde fuera con PostgREST: test 2 quedo con 19 cuentas, 0 duplicados
-- (company_id, code), y test 1 sigue con sus 2 cuentas intactas).
--
-- MOTIVO: la empresa "test 2" (971bec43-5c57-44a3-92b0-db7f909c5276, tenant
-- TEST1DS) tiene 0 filas en `Account`, asi que la integracion contable de
-- compras (fail-closed, 065) no puede aprobar ninguna compra:
-- `No se puede contabilizar: falta la cuenta de "...". Configúrala antes de
-- continuar.` (`resolverCuentasDeCompra` en lib/purchase-db.ts). Hoy afecta a
-- Fac-1102 (PENDING_APPROVAL).
--
-- BUG DE FONDO (medido): la tabla `Account` todavia tiene el UNIQUE POR TENANT
-- `unique_account_code_per_tenant (code, "tenantId")`. Como test 1 y test 2
-- comparten `TEST1DS`, test 2 no puede tener su propia `1101`/`4101` (test 1 ya
-- las tiene). La migracion **035** debia reemplazarlo por `(company_id, code)`,
-- pero NO esta aplicada y ademas hace
--   DROP ... IF EXISTS "unique_code_tenant"
-- con un NOMBRE QUE NO COINCIDE con el real, asi que ni corriendo la 035 se
-- quitaria (misma trampa que `Account_name_key` y la 044: un DROP por nombre
-- equivocado no falla, no hace nada, y el INSERT vuelve a fallar igual).
--
-- Esta migracion dropea el unique por tenant **por columnas** (no por nombre),
-- se asegura de que exista el unique por empresa `(company_id, code)` que ya
-- declara `prisma/schema.prisma` (map "Account_company_id_code_key"), y siembra
-- un plan base para test 2 coherente con los prefijos que resuelve el motor
-- contable (`lib/purchase-db.ts` -> CUENTAS_COMPRA, `lib/accounting/resolve-account.ts`).
--
-- NO toca ninguna fila de otras empresas ni ningun dato de test 1.
-- Idempotente: el DROP se salta si no hay nada que dropear y la siembra usa
-- NOT EXISTS por (company_id, code).

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Preflight
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_company text := '971bec43-5c57-44a3-92b0-db7f909c5276';
  n int;
BEGIN
  IF to_regclass('public."Account"') IS NULL THEN
    RAISE EXCEPTION '070: falta la tabla Account';
  END IF;
  IF to_regclass('public.companies') IS NULL THEN
    RAISE EXCEPTION '070: falta la tabla companies';
  END IF;
  SELECT count(*) INTO n FROM public.companies WHERE id = v_company;
  IF n = 0 THEN
    RAISE EXCEPTION '070: la empresa % (test 2) no existe en companies', v_company;
  END IF;
  RAISE NOTICE '070: preflight OK (test 2 = %)', v_company;
END $$;

-- 1. Quitar el UNIQUE por tenant de Account, POR COLUMNAS (no por nombre).
--    Cubre (code, tenantId), (code, tenant_id) y sus inversos. Aborta si no
--    dropuea nada, porque entonces el INSERT siguiente fallaria con el mismo
--    error y pareceria un problema de datos (leccion de la 030/044).
DO $$
DECLARE
  r        record;
  n        int := 0;
BEGIN
  FOR r IN
    SELECT ic.relname            AS idxname,
           k.conname             AS constraint_name,
           btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') AS c1,
           btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') AS c2
    FROM pg_index i
    JOIN pg_class     ic ON ic.oid = i.indexrelid
    JOIN pg_class     tc ON tc.oid = i.indrelid
    JOIN pg_namespace ns ON ns.oid = tc.relnamespace
    LEFT JOIN pg_constraint k ON k.conindid = i.indexrelid AND k.contype = 'u'
    WHERE ns.nspname = 'public'
      AND tc.relname = 'Account'
      AND i.indisunique
      AND NOT i.indisprimary
      AND i.indnkeyatts = 2
  LOOP
    IF (r.c1, r.c2) IN (('code','tenantId'),('tenantId','code'),('code','tenant_id'),('tenant_id','code')) THEN
      IF r.constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public."Account" DROP CONSTRAINT %I', r.constraint_name);
        RAISE NOTICE '070: dropeado CONSTRAINT % (%)', r.constraint_name, r.c1 || ',' || r.c2;
      ELSE
        EXECUTE format('DROP INDEX public.%I', r.idxname);
        RAISE NOTICE '070: dropeado INDEX % (%)', r.idxname, r.c1 || ',' || r.c2;
      END IF;
      n := n + 1;
    END IF;
  END LOOP;

  IF n = 0 THEN
    RAISE NOTICE '070: no quedaba ningun UNIQUE (code, tenant) en Account';
  END IF;
END $$;

-- 2. Asegurar el UNIQUE correcto por empresa: (company_id, code).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class ic
    JOIN pg_namespace ns ON ns.oid = ic.relnamespace
    WHERE ns.nspname = 'public' AND ic.relname = 'Account_company_id_code_key'
  ) THEN
    CREATE UNIQUE INDEX "Account_company_id_code_key" ON public."Account" ("company_id", code);
    RAISE NOTICE '070: creado UNIQUE (company_id, code)';
  ELSE
    RAISE NOTICE '070: UNIQUE (company_id, code) ya existia';
  END IF;
END $$;

-- 3. Sembrar el plan base de test 2 (idempotente por (company_id, code)).
--    Codigos elegidos para que casen con los prefijos del motor:
--      1101 (banco), 1105 (inventario), 1106 (ISV credito),
--      2101 (por pagar), 2102 (retencion), 4101/4102 (ingresos),
--      5101/5201/6101/6103/6201/6301 (gasto).
INSERT INTO public."Account"
  (id, name, code, type, description,
   "tenantId", tenant_id, tenantid,
   "parentId", parent_id,
   is_active, isactive,
   "company_id", "createdAt", "updatedAt", created_at, updated_at)
SELECT
  gen_random_uuid()::text, v.name, v.code, v.type, NULL,
  'TEST1DS', 'TEST1DS', 'TEST1DS',
  NULL, NULL,
  true, true,
  '971bec43-5c57-44a3-92b0-db7f909c5276', now(), now(), now(), now()
FROM (VALUES
  ('1101', 'Caja y Bancos',              'ASSET'),
  ('1102', 'Banco BAC',                  'ASSET'),
  ('1103', 'Cuentas por Cobrar',         'ASSET'),
  ('1105', 'Inventario de Mercaderia',   'ASSET'),
  ('1106', 'ISV Credito Fiscal',         'ASSET'),
  ('2101', 'Proveedores',                'LIABILITY'),
  ('2102', 'Retenciones por Pagar',      'LIABILITY'),
  ('2105', 'ISV por Pagar',              'LIABILITY'),
  ('2120', 'Impuestos por Pagar',        'LIABILITY'),
  ('3101', 'Capital Social',             'EQUITY'),
  ('3201', 'Utilidades Retenidas',       'EQUITY'),
  ('4101', 'Ingresos por Servicios',     'REVENUE'),
  ('4102', 'Ventas de Productos',        'REVENUE'),
  ('5101', 'Costo de Ventas',            'EXPENSE'),
  ('5201', 'Gastos de Administracion',   'EXPENSE'),
  ('6101', 'Compras',                    'EXPENSE'),
  ('6103', 'Gastos Operativos',          'EXPENSE'),
  ('6201', 'Gastos Administrativos',     'EXPENSE'),
  ('6301', 'Gastos de Ventas',           'EXPENSE')
) AS v(code, name, type)
WHERE NOT EXISTS (
  SELECT 1 FROM public."Account" a
  WHERE a."company_id" = '971bec43-5c57-44a3-92b0-db7f909c5276'
    AND a.code = v.code
);

-- 4. Post-check: no debe quedar UNIQUE por tenant y deben existir las cuentas
--    que el modulo de Compras necesita para test 2.
DO $$
DECLARE
  r      record;
  n_bad  int := 0;
  n      int;
BEGIN
  -- 4a. Ningun UNIQUE de 2 columnas sobre (code, tenant*) debe quedar.
  FOR r IN
    SELECT ic.relname AS idxname,
           btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') AS c1,
           btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') AS c2
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace ns ON ns.oid = tc.relnamespace
    WHERE ns.nspname = 'public' AND tc.relname = 'Account'
      AND i.indisunique AND NOT i.indisprimary AND i.indnkeyatts = 2
  LOOP
    IF (r.c1, r.c2) IN (('code','tenantId'),('tenantId','code'),('code','tenant_id'),('tenant_id','code')) THEN
      n_bad := n_bad + 1;
      RAISE WARNING '070: sigue vivo el UNIQUE por tenant % (%)', r.idxname, r.c1 || ',' || r.c2;
    END IF;
  END LOOP;
  IF n_bad > 0 THEN
    RAISE EXCEPTION '070: quedan % UNIQUE(s) por tenant en Account', n_bad;
  END IF;

  -- 4b. Debe existir el UNIQUE por empresa.
  IF NOT EXISTS (
    SELECT 1 FROM pg_class ic
    JOIN pg_namespace ns ON ns.oid = ic.relnamespace
    WHERE ns.nspname = 'public' AND ic.relname = 'Account_company_id_code_key'
  ) THEN
    RAISE EXCEPTION '070: falta el UNIQUE (company_id, code)';
  END IF;

  -- 4c. Cuentas minimas de Compras para test 2.
  SELECT count(*) INTO n FROM public."Account"
   WHERE "company_id" = '971bec43-5c57-44a3-92b0-db7f909c5276';
  IF n < 19 THEN
    RAISE EXCEPTION '070: test 2 tiene % cuentas, se esperaban >= 19', n;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."Account"
      WHERE "company_id" = '971bec43-5c57-44a3-92b0-db7f909c5276' AND code = '1101') THEN
    RAISE EXCEPTION '070: falta la cuenta 1101 (banco) de test 2';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."Account"
      WHERE "company_id" = '971bec43-5c57-44a3-92b0-db7f909c5276' AND code = '1105') THEN
    RAISE EXCEPTION '070: falta la cuenta 1105 (inventario) de test 2';
  END IF;

  RAISE NOTICE '070: OK - test 2 con % cuentas, sin UNIQUE por tenant', n;
END $$;

COMMIT;
