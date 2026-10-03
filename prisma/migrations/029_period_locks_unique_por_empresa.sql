-- =============================================================================
-- 029_period_locks_unique_por_empresa.sql
-- CIERRE POR EMPRESA (NO POR TENANT)
-- =============================================================================
-- POR QUE ESTA MIGRACION
--
-- MEDIDO antes de escribirla (30 Sept 2026): `period_locks` YA TIENE
-- `company_id` (FK a `companies.id`, text) y `location_id` (uuid, NULL en las 5
-- filas). O sea que aqui NO hay que anadir columna. Hay que:
--   1) backfillear los NULL (hoy 0, pero la columna los permite), y
--   2) cambiar la UNIQUE, que hoy es `UNIQUE (tenant_id, year, month)`.
--
-- POR QUE ESO NO AISLA
--
-- `TEST1DS` tiene DOS empresas: "test 1" y "test 2". Con `UNIQUE (tenant_id,
-- year, month)`, si "test 1" cierra agosto, "test 2" recibe "ya existe el
-- bloqueo" de una empresa que no es la suya: **cierra en falso**. Y si la
-- constraint se relajara, un lock bloquearia el cierre de la hermana. Es el mismo
-- bug que el de las vistas, aqui en la tabla que decide si puedes cerrar.
--
-- `location_id` se deja FUERA del unique a proposito: es NULL en las 5 filas y
-- `AGENTS.md` fija que NULL = "a nivel de empresa". Meterlo haria que todos los
-- cierres de empresa colapsaran en un unico valor de NULL por mes.
--
-- LO QUE ESTA MIGRACION NO ARREGLA
--
-- `app/api/accounting/period-cierre/route.ts` sigue tomando el `companyId` de la
-- peticion del cliente. Esto es la capa de datos: ninguna constraint arregla un
-- hole de aplicacion, y el trigger de abajo lanza excepcion en vez de adivinar,
-- asi que el error sale en la ruta y no en silencio.
--
-- APLICAR EN SUPABASE SQL EDITOR. Es DDL: backup antes. Idempotente.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. PREFLIGHT
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_nulls integer;
  v_dups integer;
  v_con_location integer;
BEGIN
  SELECT count(*) INTO v_nulls FROM period_locks WHERE company_id IS NULL;

  -- Si dos empresas comparten (company_id, year, month), el UNIQUE nuevo no se
  -- puede crear sin decidir que fila sobrevive.
  SELECT count(*) INTO v_dups FROM (
    SELECT 1 FROM period_locks
    WHERE company_id IS NOT NULL
    GROUP BY company_id, year, month HAVING count(*) > 1) q;

  SELECT count(*) INTO v_con_location FROM period_locks WHERE location_id IS NOT NULL;

  RAISE NOTICE 'preflight: company_id NULL=% | duplicados (empresa,anio,mes)=% | con location_id=%',
    v_nulls, v_dups, v_con_location;

  IF v_con_location > 0 THEN
    RAISE EXCEPTION
      'Hay % bloqueos con location_id. Este UNIQUE es a nivel de empresa; habria que decidir si el cierre por sede necesita el suyo.', v_con_location;
  END IF;

  -- Backfill defensivo. Medido: 0 NULL, asi que normalmente no hace nada.
  UPDATE period_locks pl
  SET company_id = c.id
  FROM companies c
  WHERE pl.company_id IS NULL
    AND pl.tenant_id = c.tenant_id
    AND 1 = (SELECT count(*) FROM companies c2 WHERE c2.tenant_id = pl.tenant_id);

  -- Lo que sigue sin poder atribuirse se reporta, no se inventa.
  SELECT count(*) INTO v_nulls FROM period_locks WHERE company_id IS NULL;
  IF v_nulls > 0 THEN
    RAISE EXCEPTION
      'Quedan % bloqueos sin company_id y su tenant no resuelve a una unica empresa. Atribuir a mano.', v_nulls;
  END IF;

  IF v_dups > 0 THEN
    RAISE EXCEPTION
      'Hay % combinaciones (empresa,anio,mes) con mas de un bloqueo. Resolver a mano antes de crear el UNIQUE.', v_dups;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Quitar el UNIQUE POR TENANT y poner el POR EMPRESA.
--
-- MISMO CASO QUE LA 030: el UNIQUE de Prisma se crea con `CREATE UNIQUE INDEX`,
-- asi que es un INDICE y no aparece en `pg_constraint` con contype='u'. Postgres
-- reporta igual `violates unique constraint`, que por el nombre del indice. Por eso
-- se recorre `pg_index`.
--
-- `indkey` es `int2vector` y no tiene ARRAY[], asi que se castea a smallint[]
-- para poder hacer unnest() y sacar el nombre de cada columna. Con eso se compara
-- la lista COMPLETA: solo se baja el que sea exactamente (tenant_id, year, month).
-- No se baja a ciegas nada que mencione tenant_id.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  cols text[];
  n_drop integer := 0;
BEGIN
  FOR r IN
    SELECT i.indexrelid, i.indkey, ic.relname AS idx_name, i.indisprimary,
           EXISTS (SELECT 1 FROM pg_constraint k
                   WHERE k.conindid = i.indexrelid AND k.contype = 'u') AS es_constraint
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
    WHERE nsp.nspname = 'public' AND tc.relname = 'period_locks' AND i.indisunique
  LOOP
    IF r.indisprimary THEN
      RAISE NOTICE 'se conserva (pk): %', r.idx_name;
      CONTINUE;
    END IF;

    SELECT array_agg(a.attname ORDER BY k.ord) INTO cols
    FROM unnest(r.indkey::smallint[]) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a
      ON a.attrelid = 'public.period_locks'::regclass
     AND a.attnum = k.attnum;

    IF cols = ARRAY['tenant_id','year','month'] THEN
      IF r.es_constraint THEN
        EXECUTE format('ALTER TABLE public.period_locks DROP CONSTRAINT %I', r.idx_name);
      ELSE
        EXECUTE format('DROP INDEX IF EXISTS public.%I', r.idx_name);
      END IF;
      n_drop := n_drop + 1;
      RAISE NOTICE 'dropped unique por TENANT: %', r.idx_name;
    ELSE
      RAISE NOTICE 'se conserva: %  (columnas: %)', r.idx_name, array_to_string(cols, ',');
    END IF;
  END LOOP;

  IF n_drop = 0 THEN
    RAISE EXCEPTION
      'No se encontro el UNIQUE (tenant_id, year, month) en period_locks. Revisar pg_index antes de seguir.';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. El UNIQUE que si aísla, y un indice normal para las consultas por empresa.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS period_locks_company_year_month_key
  ON public.period_locks (company_id, year, month);

CREATE INDEX IF NOT EXISTS period_locks_company_id_idx
  ON public.period_locks (company_id);

-- -----------------------------------------------------------------------------
-- 3. Que las rutas rellenen company_id al insertar un lock.
--
-- Sin esto el UNIQUE nuevo deja pasar el bug original: si alguien inserta solo con
-- tenant_id, `company_id` queda NULL, y NULL no colisiona en un UNIQUE, asi que
-- dos empresas del mismo tenant podrian "cerrar" el mismo mes sin chocar.
--
-- El trigger deriva de `companies` por tenant, y cuando no puede decidir lanza
-- excepcion en vez de adivinar. Ese caso es real: `TEST1DS` tiene dos empresas.
-- Que falle ruidosamente aqui es mejor que un NULL silencioso que cierre en falso.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_period_locks_company_id()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_cuantas integer;
  v_id text;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'period_locks: hace falta company_id o tenant_id';
  END IF;

  SELECT count(*), min(id) INTO v_cuantas, v_id
  FROM companies WHERE tenant_id = NEW.tenant_id;

  IF v_cuantas = 0 THEN
    RAISE EXCEPTION 'period_locks: el tenant_id % no corresponde a ninguna empresa', NEW.tenant_id;
  ELSIF v_cuantas > 1 THEN
    RAISE EXCEPTION
      'period_locks: el tenant % tiene % empresas, no se puede deducir company_id. Pasalo explicito.',
      NEW.tenant_id, v_cuantas;
  END IF;

  NEW.company_id := v_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_period_locks_company_id ON public.period_locks;
CREATE TRIGGER trg_period_locks_company_id
  BEFORE INSERT OR UPDATE ON public.period_locks
  FOR EACH ROW EXECUTE FUNCTION public.trg_period_locks_company_id();

COMMIT;

-- =============================================================================
-- VERIFICACION (read-only, o con la prueba del punto 3 que es reversible)
-- =============================================================================
-- 1) Los indices correctos (esperado: UNIQUE sobre company_id, year, month):
--      SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'period_locks';
--
-- 2) Las 5 filas conservadas con su company_id:
--      SELECT company_id, year, month, status FROM period_locks ORDER BY year, month;
--
-- 3) PRUEBA DE AISLAMIENTO, y es lo que compra esta migracion.
--    test 1 y test 2 comparten TEST1DS y antes NO podian cerrar el mismo mes.
--    Con year 2099 no toca cierres reales. Debe ACEPTAR las dos:
--      BEGIN;
--      INSERT INTO period_locks (tenant_id, company_id, year, month, status)
--      VALUES ('TEST1DS', '8143dd4e-a4ef-4619-87a2-0504d0c8c46a', 2099, 1, 'closed');
--      INSERT INTO period_locks (tenant_id, company_id, year, month, status)
--      VALUES ('TEST1DS', '971bec43-76f2-4d6a-9c3e-1a2b3c4d5e6f', 2099, 1, 'closed');
--      COMMIT;
--      -- test 2: pon el id REAL de "test 2" (971bec43-...), no el de ejemplo.
--      -- Antes de la 029, la segunda INSERT daba 23505.
--
-- 4) El trigger avisa en vez de adivinar (esta DEBE fallar, es lo correcto):
--      INSERT INTO period_locks (tenant_id, year, month, status)
--      VALUES ('TEST1DS', 2099, 2, 'closed');
--      -- sin company_id y con un tenant de 2 empresas -> RAISE EXCEPTION
--
-- 5) Sigue pendiente la RUTA: `app/api/accounting/period-cierre/route.ts` toma el
--    companyId de la peticion. Ninguna constraint arregla eso.
-- =============================================================================
