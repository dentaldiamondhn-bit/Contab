-- 051 — cost_payments: unicidad POR EMPRESA, no por tenant
--
-- Estado: APLICADA Y VERIFICADA (8 Oct 2026) en el SQL Editor de Supabase.
-- Medido antes: la tabla tenia 0 filas, asi que el cambio fue sin riesgo de datos.
-- Verificacion EXTERNA (PostgREST + service_role), no por el "Success":
--   - test 1 inserta (TEST1DS, fixed, clave)                       -> 201
--   - test 1 repite la clave                                       -> 409 23505
--   - test 2 con la MISMA (tenant, cost_type, cost_key)            -> 201  <- prueba
--     de que el unique viejo POR TENANT ya no existe
--   - test 2 repite la suya                                        -> 409 23505
--   - 2 filas de prueba borradas; cost_payments: 0 -> 0 filas
--
-- Problema: supabase/COST_PAYMENTS.sql:16 creo
--   UNIQUE (tenant_id, cost_type, cost_key)
-- Es el mismo error de diseno que UNIQUE (rtn, tenant_id) de Supplier (044):
-- test 1 y test 2 comparten el tenant TEST1DS, asi que no pueden tener costos
-- con la misma clave; el upsert de la ruta costs/POST pisaria la fila de la
-- empresa hermana (le cambiaria company_id y amount).
--
-- Lo que hace: pasa la unicidad a
--   UNIQUE (company_id, cost_type, cost_key)
--
-- En codigo, `app/api/companies/[id]/costs/route.ts` ya NO usa upsert a ciegas:
-- lee por company_id, actualiza por id e inserta lo nuevo. Si el insert choca con
-- el unique viejo (hermana del mismo tenant con esa clave) devuelve 409 con este
-- nombre de fichero. Aplicada esta migracion, ese 409 deja de poder ocurrir.
--
-- OJO: la funcion legacy `upsert_cost_payment` (COST_PAYMENTS.sql) hace
-- ON CONFLICT (tenant_id, cost_type, cost_key) y escribe sin company_id; tras esta
-- migracion ese ON CONFLICT ya no tiene un unique que lo sostenga, asi que NO la
-- uses desde la app (la ruta filtra con .eq('company_id', ...)).
--
-- LECCION del primer intento (8 Oct 2026): la version previa de este fichero
-- comparaba `array_agg(a.attname ORDER BY a.attname)` (que devuelve las columnas
-- ORDENADAS ALFABETICAMENTE) contra un literal en orden de declaracion
-- `ARRAY['company_id','cost_type','cost_key']`. La igualdad de arrays es posicion
-- a posicion, asi que NUNCA coincidia: el paso 3 no veia el constraint ya creado,
-- el paso 4 lo creaba, y el post-check —con el mismo literal mal ordenado— no lo
-- encontraba y abortaba. El post-check hizo su trabajo (abortar en vez de decir
-- "ok"), y el rollback dejo la base intacta. Ahora se busca como la 044:
-- `pg_index` + `pg_get_indexdef(..., n, true)` por posicion y un conteo con
-- `generate_series` para que el ORDEN de las columnas del indice deje de importar.

BEGIN;

DO $$
DECLARE
  v_nulas        integer;
  v_total        integer;
  v_col_ok       integer;
  v_viejo_oid    oid;
  v_viejo_nombre text;
  v_con_nombre   text;
  v_nuevo_oid    oid;
  v_nuevo_nombre text;
BEGIN
  -- 0) La tabla existe?
  IF to_regclass('public.cost_payments') IS NULL THEN
    RAISE EXCEPTION '051: no existe la tabla public.cost_payments';
  END IF;

  -- 0b) La columna company_id existe? (sin ella no hay aislamiento posible)
  SELECT count(*) INTO v_col_ok
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'cost_payments'
    AND a.attname = 'company_id' AND a.attnum > 0 AND NOT a.attisdropped;
  IF v_col_ok = 0 THEN
    RAISE EXCEPTION '051: cost_payments no tiene columna company_id; aplica antes la que la añade';
  END IF;

  -- 1) Preflight: ninguna fila puede quedar sin empresa (no hay de donde
  --    deducirla, y el unique nuevo trata NULLs como distintos).
  SELECT count(*) INTO v_nulas FROM public.cost_payments WHERE company_id IS NULL;
  IF v_nulas > 0 THEN
    RAISE EXCEPTION '051: hay % filas de cost_payments sin company_id; atribuyelas antes de aplicar', v_nulas;
  END IF;

  -- 2) Localizar el unique VIEJO {tenant_id, cost_type, cost_key} POR COLUMNAS,
  --    no por nombre (el nombre default puede no ser el que esta en la base:
  --    leccion de 044/030). El conteo con generate_series compara como CONJUNTO,
  --    asi que el orden de las columnas del indice no importa.
  SELECT i.indexrelid, ic.relname
    INTO v_viejo_oid, v_viejo_nombre
  FROM pg_index i
  JOIN pg_class ic ON ic.oid = i.indexrelid
  JOIN pg_class tc ON tc.oid = i.indrelid
  JOIN pg_namespace n ON n.oid = tc.relnamespace
  WHERE n.nspname = 'public' AND tc.relname = 'cost_payments'
    AND i.indisunique AND i.indnkeyatts = 3
    AND (
      SELECT count(*) FROM generate_series(1, 3) AS g
      WHERE pg_get_indexdef(i.indexrelid, g, true) IN ('tenant_id', 'cost_type', 'cost_key')
    ) = 3
  LIMIT 1;

  -- 3) ¿El unique NUEVO {company_id, cost_type, cost_key} ya existe?
  SELECT i.indexrelid, ic.relname
    INTO v_nuevo_oid, v_nuevo_nombre
  FROM pg_index i
  JOIN pg_class ic ON ic.oid = i.indexrelid
  JOIN pg_class tc ON tc.oid = i.indrelid
  JOIN pg_namespace n ON n.oid = tc.relnamespace
  WHERE n.nspname = 'public' AND tc.relname = 'cost_payments'
    AND i.indisunique AND i.indnkeyatts = 3
    AND (
      SELECT count(*) FROM generate_series(1, 3) AS g
      WHERE pg_get_indexdef(i.indexrelid, g, true) IN ('company_id', 'cost_type', 'cost_key')
    ) = 3
  LIMIT 1;

  -- 4) Cambiar la unicidad: primero fuera el viejo (constraint o indice suelto).
  IF v_viejo_oid IS NOT NULL THEN
    SELECT con.conname INTO v_con_nombre
    FROM pg_constraint con WHERE con.conindid = v_viejo_oid;

    IF v_con_nombre IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.cost_payments DROP CONSTRAINT %I', v_con_nombre);
      RAISE NOTICE '051: unique viejo % (por tenant) eliminado (era un CONSTRAINT)', v_con_nombre;
    ELSE
      EXECUTE format('DROP INDEX public.%I', v_viejo_nombre);
      RAISE NOTICE '051: indice unico viejo % (por tenant) eliminado (era un indice suelto)', v_viejo_nombre;
    END IF;
  ELSE
    RAISE NOTICE '051: no hay unique sobre {tenant_id, cost_type, cost_key}; nada que eliminar';
  END IF;

  IF v_nuevo_oid IS NULL THEN
    ALTER TABLE public.cost_payments
      ADD CONSTRAINT cost_payments_company_cost_key UNIQUE (company_id, cost_type, cost_key);
    RAISE NOTICE '051: unique nuevo (company_id, cost_type, cost_key) creado';
  ELSE
    RAISE NOTICE '051: el unique (company_id, cost_type, cost_key) ya existia como %', v_nuevo_nombre;
  END IF;

  -- 5) Post-check: medir el resultado, no fiarse de "no dio error".
  SELECT i.indexrelid INTO v_nuevo_oid
  FROM pg_index i
  JOIN pg_class ic ON ic.oid = i.indexrelid
  JOIN pg_class tc ON tc.oid = i.indrelid
  JOIN pg_namespace n ON n.oid = tc.relnamespace
  WHERE n.nspname = 'public' AND tc.relname = 'cost_payments'
    AND i.indisunique AND i.indnkeyatts = 3
    AND (
      SELECT count(*) FROM generate_series(1, 3) AS g
      WHERE pg_get_indexdef(i.indexrelid, g, true) IN ('company_id', 'cost_type', 'cost_key')
    ) = 3
  LIMIT 1;

  IF v_nuevo_oid IS NULL THEN
    RAISE EXCEPTION '051: post-check fallo: no existe el unique (company_id, cost_type, cost_key)';
  END IF;

  -- 5b) El viejo NO puede seguir vivo: si sigue, dos empresas del mismo tenant
  --     seguirian pisandose la clave y la migracion no habria servido de nada.
  SELECT i.indexrelid INTO v_viejo_oid
  FROM pg_index i
  JOIN pg_class ic ON ic.oid = i.indexrelid
  JOIN pg_class tc ON tc.oid = i.indrelid
  JOIN pg_namespace n ON n.oid = tc.relnamespace
  WHERE n.nspname = 'public' AND tc.relname = 'cost_payments'
    AND i.indisunique AND i.indnkeyatts = 3
    AND (
      SELECT count(*) FROM generate_series(1, 3) AS g
      WHERE pg_get_indexdef(i.indexrelid, g, true) IN ('tenant_id', 'cost_type', 'cost_key')
    ) = 3
  LIMIT 1;

  IF v_viejo_oid IS NOT NULL THEN
    RAISE EXCEPTION '051: post-check fallo: sigue existiendo un unique (tenant_id, cost_type, cost_key)';
  END IF;

  SELECT count(*) INTO v_total FROM public.cost_payments;
  RAISE NOTICE '051: listo. cost_payments con % filas; unicidad por empresa (company_id).', v_total;
END $$;

COMMIT;
