-- 073 — El codigo de almacen es unico POR EMPRESA (`company_id`), no por tenant
--
-- QUE ARREGLA. El 17 Oct 2026 el usuario vio un 500 al crear un almacén desde
-- el navegador (Nuevo Almacen -> guardar). Diagnóstico medido contra la BD real
-- (service_role):
--
--   - La BD real tiene `UNIQUE (tenant_id, code)` en `warehouse`
--     (constraint `warehouse_tenant_code_unique`) que **no esta en el repo**:
--     no esta en `supabase/MASTER_SETUP.sql`, ni en ninguna migracion, ni en
--     `prisma/schema.prisma` (la tabla `warehouse` ni siquiera esta modelada).
--     Es drift creado a mano o por un setup antiguo.
--   - El codigo (080) genera la serie ALM-### **por empresa** (decision del
--     usuario, misma fila que las facturas 070/067 y las ubicaciones 079).
--     `TEST1DS` tiene DOS empresas, y test 1 ya tenia ALM-001/ALM-002: cuando
--     test 2 creo su primer almacén, el servidor calculó ALM-001 (serie vacia
--     de ESA empresa) y el INSERT reviento con
--     `23505 duplicate key value violates unique constraint
--     "warehouse_tenant_code_unique"`.
--   - El objeto de error de PostgREST NO es `instanceof Error` (es un objeto
--     plano `{ code, details, hint, message }`), asi que la ruta respondia un
--     500 generico "Error interno" y el `console.error` imprimia `{}`.
--
-- Medido antes de escribir esto (17 Oct 2026, service_role):
--   - `warehouse` en tenant TEST1DS: 2 filas, ambas de test 1
--     (ALM-001, ALM-002), 0 de test 2. Ninguna con company_id NULL.
--   - El unique NO es global sobre `code`: insertar ALM-001 en un tenant
--     inventado ("ZZZPROBE") salio bien. Es (tenant_id, code).
--   - `product_location` NO tiene ningun unique: UB-001 de test 1 y UB-001
--     de test 2 coexisten (medido insertando y borrando una fila probe).
--     La serie UB-### no necesita esta migracion.
--
-- A PARTIR DE AQUI la unicidad real pasa a ser
-- `UNIQUE (company_id, code)`. Coincide con lo que ya hace
-- `lib/services/warehouse-service.ts` (`proximoNumeroCodigoAlmacen` mira solo
-- las filas de ESA empresa) y con `UNIQUE("company_id", "invoiceNumber")`
-- de la 067: la frontera es `company_id`.
--
-- LO QUE NO HACE: no toca ninguna fila. Es schema puro. No anade `NOT NULL` a
-- `company_id` (la 023 ya lo relleno y hoy no hay NULL, pero forzarlo es otra
-- decision); el preflight aborta si apareciera un NULL.
--
-- IDEMPOTENTE y con comprobacion de que dropea algo. Un `DROP` que no encuentra
-- su objetivo no falla: seguiria "Success" con la restriccion vieja viva y test
-- 2 seguiria chocando con 23505. Por eso el post-check lee `pg_index` (no
-- `pg_constraint` solo: el indice puede ser suelto) y ABORTA si el UNIQUE viejo
-- sigue o si falta el nuevo. Sigue el patron exacto de la 067.

-- ============================================================================
-- PREFLIGHT
-- ============================================================================
DO $$
DECLARE
  v_existe_tabla boolean;
  v_tipo_empresa text;
  v_nulos        bigint;
  v_dupes        text;
  v_viejo_def    text;
  v_global_def   text;
  v_nuevo_def    text;
BEGIN
  SELECT to_regclass(format('public.%I', 'warehouse')) IS NOT NULL INTO v_existe_tabla;
  IF NOT v_existe_tabla THEN
    RAISE EXCEPTION '073 ABORTA: no existe la tabla public.warehouse.';
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v_tipo_empresa
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'warehouse'
     AND a.attname = 'company_id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_tipo_empresa IS NULL THEN
    RAISE EXCEPTION '073 ABORTA: warehouse.company_id no existe. Aplica la 023
      (company_level_isolation) antes.';
  END IF;

  -- Medido el 17 Oct 2026: 0 filas con company_id NULL, asi que no hay
  -- backfill que hacer (y rellenarlo a ciegas seria inventar empresa, leccion
  -- de la 040). Un UNIQUE con NULL no protege: si apareciera alguno, abortar.
  SELECT count(*) INTO v_nulos FROM public.warehouse WHERE company_id IS NULL;
  IF v_nulos > 0 THEN
    RAISE EXCEPTION '073 ABORTA: % almacenes con company_id NULL que no se
      pudieron deducir. Atribuyelos a su empresa antes.', v_nulos;
  END IF;

  -- Duplicados por empresa: si hay, el CREATE UNIQUE falla a mitad.
  SELECT string_agg(d, '; ') INTO v_dupes FROM (
    SELECT format('%s / %s (x%s)', company_id, code, n) AS d
    FROM (
      SELECT company_id, code, count(*) AS n
      FROM public.warehouse
      GROUP BY company_id, code
      HAVING count(*) > 1
    ) q
  ) s;
  IF v_dupes IS NOT NULL THEN
    RAISE EXCEPTION '073 ABORTA: almacenes duplicados por empresa: %', v_dupes;
  END IF;

  -- Localizar el UNIQUE viejo (tenant_id, code) POR COLUMNAS, no por nombre
  -- (leccion de la 044/051/067).
  SELECT pg_get_indexdef(i.indexrelid) INTO v_viejo_def
    FROM pg_index i
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'warehouse'
     AND i.indisunique AND i.indnkeyatts = 2
     AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'tenant_id'
     AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'code'
   LIMIT 1;
  IF v_viejo_def IS NULL THEN
    RAISE NOTICE '073: no hay UNIQUE (tenant_id, code). Nada que cambiar (ya aplicada).';
  ELSE
    RAISE NOTICE '073: UNIQUE viejo encontrado: %', v_viejo_def;
  END IF;

  -- Un UNIQUE global sobre code (no medido, pero por si acaso) tambien romperia
  -- la serie por empresa: abortar en vez de crear un segundo unique encima.
  SELECT pg_get_indexdef(i.indexrelid) INTO v_global_def
    FROM pg_index i
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'warehouse'
     AND i.indisunique AND i.indnkeyatts = 1
     AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'code'
   LIMIT 1;
  IF v_global_def IS NOT NULL THEN
    RAISE EXCEPTION '073 ABORTA: sigue vivo un UNIQUE global sobre code (%).
      Borralo antes.', v_global_def;
  END IF;

  SELECT pg_get_indexdef(i.indexrelid) INTO v_nuevo_def
    FROM pg_index i
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'warehouse'
     AND i.indisunique AND i.indnkeyatts = 2
     AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'company_id'
     AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'code'
   LIMIT 1;
  IF v_nuevo_def IS NOT NULL THEN
    RAISE NOTICE '073: el UNIQUE por empresa YA existe: %', v_nuevo_def;
  END IF;
END $$;

-- ============================================================================
-- CAMBIOS
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Fuera el UNIQUE (tenant_id, code). CONSTRAINT si lo sostiene un indice de
--    constraint, INDEX si es suelto. `DROP INDEX` sobre un indice de constraint
--    aborta la transaccion, por eso los dos caminos.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_con_nombre text;
  v_ind_nombre text;
  v_dropeo     text := 'nada';
BEGIN
  SELECT con.conname INTO v_con_nombre
    FROM pg_index i
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
    JOIN pg_constraint con ON con.conindid = i.indexrelid
   WHERE nsp.nspname = 'public' AND tc.relname = 'warehouse'
     AND i.indisunique AND i.indnkeyatts = 2
     AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'tenant_id'
     AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'code'
   LIMIT 1;

  IF v_con_nombre IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.warehouse DROP CONSTRAINT %I', v_con_nombre);
    v_dropeo := 'CONSTRAINT ' || v_con_nombre;
  ELSE
    SELECT ic.relname INTO v_ind_nombre
      FROM pg_index i
      JOIN pg_class ic ON ic.oid = i.indexrelid
      JOIN pg_class tc ON tc.oid = i.indrelid
      JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
     WHERE nsp.nspname = 'public' AND tc.relname = 'warehouse'
       AND i.indisunique AND i.indnkeyatts = 2
       AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'tenant_id'
       AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'code'
     LIMIT 1;
    IF v_ind_nombre IS NOT NULL THEN
      EXECUTE format('DROP INDEX public.%I', v_ind_nombre);
      v_dropeo := 'INDEX ' || v_ind_nombre;
    END IF;
  END IF;

  IF v_dropeo = 'nada' THEN
    RAISE NOTICE '073: no habia UNIQUE (tenant_id, code) que borrar.';
  ELSE
    RAISE NOTICE '073: borrado %.', v_dropeo;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. El UNIQUE correcto: el codigo es unico por empresa. Solo si no existe ya.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_existe boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM pg_index i
      JOIN pg_class tc ON tc.oid = i.indrelid
      JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
     WHERE nsp.nspname = 'public' AND tc.relname = 'warehouse'
       AND i.indisunique AND i.indnkeyatts = 2
       AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'company_id'
       AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'code'
  ) INTO v_existe;

  IF v_existe THEN
    RAISE NOTICE '073: el UNIQUE por empresa ya existe; no se crea de nuevo.';
  ELSE
    CREATE UNIQUE INDEX "warehouse_company_id_code_key"
      ON public.warehouse (company_id, code);
    RAISE NOTICE '073: creado "warehouse_company_id_code_key".';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- POST-CHECK
-- ============================================================================
DO $$
DECLARE
  v_viejo text;
  v_nuevo text;
  v_nulos bigint;
BEGIN
  SELECT pg_get_indexdef(i.indexrelid) INTO v_viejo
    FROM pg_index i
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'warehouse'
     AND i.indisunique AND i.indnkeyatts = 2
     AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'tenant_id'
     AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'code'
   LIMIT 1;

  -- El UNIQUE viejo NO debe quedar: si el DROP no encontro su objetivo,
  -- test 2 chocaria igual con 23505.
  IF v_viejo IS NOT NULL THEN
    RAISE EXCEPTION '073 FALLA: sigue el UNIQUE viejo sobre (tenant_id, code): %',
      v_viejo;
  END IF;

  -- El UNIQUE nuevo DEBE estar.
  SELECT pg_get_indexdef(i.indexrelid) INTO v_nuevo
    FROM pg_index i
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'warehouse'
     AND i.indisunique AND i.indnkeyatts = 2
     AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'company_id'
     AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'code'
   LIMIT 1;
  IF v_nuevo IS NULL THEN
    RAISE EXCEPTION '073 FALLA: no quedo el UNIQUE (company_id, code).';
  END IF;

  SELECT count(*) INTO v_nulos FROM public.warehouse WHERE company_id IS NULL;
  IF v_nulos > 0 THEN
    RAISE EXCEPTION '073 FALLA: % almacenes sin company_id; el UNIQUE no los cubre.',
      v_nulos;
  END IF;

  RAISE NOTICE '073 OK: el codigo de almacen es unico por empresa (company_id,
    code). Verificado en pg_index.';
END $$;
