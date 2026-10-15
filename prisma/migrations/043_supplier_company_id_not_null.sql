-- 043: `Supplier.company_id` NOT NULL + FK a `companies(id)`
--
-- Que arregla: `Supplier.company_id` era NULLABLE. Medido el 5 Oct 2026 con el
-- OpenAPI de PostgREST: `Supplier.required` es
-- `["id","rtn","name","supplier_type","is_active","tenant_id"]`, o sea que
-- `company_id` NO esta en la lista. Las dos tablas hijas del mismo modulo
-- (`supplier_price_history` y `supplier_ratings`) SI son NOT NULL: esta era la
-- unica del modulo de Compras/Proveedores que se habia quedado fuera.
--
-- POR QUE ES UN FALLO Y NO COSMETICO. El GET de `/api/suppliers` filtra
-- `.eq('company_id', empresa.companyId)` (`route.ts:65`), o sea que **una fila con
-- `company_id` NULL no la ve NINGUN usuario**. No da error, no aparece en el
-- listado, no aparece en un contador: simplemente desaparece. Y el proveedor
-- sigue existiendo en la base, referring en `Purchase`, y avisando en
-- `supplier_price_history`. Es el modo de fallo que mas caro sale de este
-- proyecto, porque se lee como "no hay datos" y no como "hay una fila mal".
--
-- Y ADEMAS NO HABIA FK A `companies(id)`. Verificado insertando de verdad: se
-- acepto un proveedor con `company_id = '00000000-dead-...'`, que no existe en
-- `companies` (8 empresas reales). Esa fila tambien es invisible para todos, y
-- no hay ninguna constraint que avise. La 041 si creo la FK en
-- `supplier_price_history`; a `Supplier` no se le dio.
--
-- ESTADO MEDIDO ANTES DE ESCRIBIR ESTO (PostgREST, 5 Oct 2026):
--   - `Supplier.company_id` existe, es `text` (porque `companies.id` es `text`)
--   - 3 proveedores, **0 con `company_id` NULL**, 0 con `tenant_id` NULL
--   - 0 con `company_id` que no exista en `companies`
--   - 0 incoherentes entre `company_id` y el `tenant_id` de su empresa (la 040)
-- Osea que la migracion no tiene que tocar ninguna fila: solo cierra la puerta.
--
-- LO QUE ESTO NO HACE: cambiar el comportamiento de la aplicacion. El codigo ya
-- escribia `company_id` desde el contexto validado (`buildInsert`, y
-- `exigirEmpresa` lanza 400 si no puede determinar la empresa), asi que por la
-- ruta no se podia colar un NULL. Lo que se cierra es la puerta de los inserts a
-- mano: `service_role`, `scripts/` y el SQL Editor.
--
-- IDEMPOTENCIA: se puede correr las veces que haga falta. El `SET NOT NULL` se
-- condiciona a que no queden filas nulas (con preflight que ABORTA antes), y el
-- `ADD CONSTRAINT` va dentro de un `IF NOT EXISTS` de `pg_constraint`.
--
-- OJO con el peso de `SET NOT NULL` en Postgres: `ALTER TABLE ... SET NOT NULL`
-- reescribe la tabla entera bajo un lock ACCESS EXCLUSIVE. Con 3 filas es
-- instantaneo. En una tabla grande seria una operacionOffline/online con un
-- `NOT VALID` CHECK y `VALIDATE CONSTRAINT` despues, que es el patron que usa
-- Postgres para esto. A esta escala no hace falta y seria complicar el archivo.

-- ============================================================================
-- PREFLIGHT
-- ============================================================================
DO $$
DECLARE
  v_columna_existe boolean;
  v_tipo          text;
  v_null          bigint;
  v_huerfanas     bigint;
  v_tenant_null   bigint;
  v_incoherentes  bigint;
  v_empresas      bigint;
BEGIN
  -- ---------------------------------------------------------------------------
  -- 1. La columna tiene que existir, y ser `text`.
  --
  -- `add column if not exists` NO cambia el tipo si la columna ya existe: se lo
  -- traga en silencio y revienta mas tarde con un "operator does not exist"
  -- lejos de la causa (ya cobrado en este proyecto). Si el tipo fuera `uuid`,
  -- declarar la FK a `companies(id)` (que es text) daria `42804` aqui.
  -- ---------------------------------------------------------------------------
  SELECT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'Supplier'
      AND a.attname = 'company_id' AND a.attnum > 0 AND NOT a.attisdropped
  ) INTO v_columna_existe;

  IF NOT v_columna_existe THEN
    RAISE EXCEPTION '043 ABORTA: "Supplier"."company_id" no existe. El preflight
      no la crea: esta migracion la da por hecha. Revisar si falta el
      purchase-db-migration-01.';
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod)
    INTO v_tipo
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'Supplier'
     AND a.attname = 'company_id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_tipo <> 'text' THEN
    RAISE EXCEPTION '043 ABORTA: "Supplier"."company_id" es % y se esperaba text.
      Si companies.id cambio de tipo, TODAS las tablas con company_id hay que
      migrarlas a la vez.', v_tipo;
  END IF;

  -- El destino de la FK. Si `companies` no esta, la FK no se puede crear.
  SELECT count(*) INTO v_empresas FROM public.companies;
  IF v_empresas = 0 THEN
    RAISE EXCEPTION '043 ABORTA: public.companies esta vacia o no existe.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- 2. Lo que impediria el NOT NULL, y lo que impediria la FK.
  --
  -- Cada uno ABORTA con el detalle en vez de "arreglarlo". Rellenar una empresa
  -- que no se puede deducir seria INVENTAR a que empresa pertenece un
  -- proveedor: justo el error que corrigio la 027b2 (propagar el company_id
  -- roto de Transaction habia destruido la unica atribucion coherente).
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_null
    FROM public."Supplier" WHERE company_id IS NULL;

  IF v_null > 0 THEN
    RAISE EXCEPTION '043 ABORTA: % proveedor(es) con company_id NULL. No se
      rellenan: no hay empresa de la que deducirlas sin inventar. Ver:
      SELECT id, rtn, name, tenant_id FROM "Supplier" WHERE company_id IS NULL;',
      v_null;
  END IF;

  SELECT count(*) INTO v_huerfanas
    FROM public."Supplier" s
   WHERE s.company_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = s.company_id);

  IF v_huerfanas > 0 THEN
    RAISE EXCEPTION '043 ABORTA: % proveedor(es) con company_id que no existe en
      companies. La FK no se puede crear hasta que se decida a que empresa
      pertenecen. Ver:
      SELECT s.rtn, s.name, s.company_id FROM "Supplier" s
       WHERE NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = s.company_id);',
      v_huerfanas;
  END IF;

  -- `tenant_id` es NOT NULL desde antes; se comprueba porque el indice de la 043
  -- es sobre (company_id, tenant_id) y una fila sin tenant no lo aprovecha.
  SELECT count(*) INTO v_tenant_null
    FROM public."Supplier" WHERE tenant_id IS NULL;

  IF v_tenant_null > 0 THEN
    RAISE NOTICE '043 ATENCION: % proveedor(es) con tenant_id NULL. No bloquea
      nada (esta columna ya es NOT NULL segun el OpenAPI, asi que esto no deberia
      pasar), pero el indice compuesto las deja fuera.', v_tenant_null;
  END IF;

  -- Aviso, no abort: la incoherencia company_id/tenant_id NO es motivo para
  -- impedir un NOT NULL. La fijo la 040 y ya se mide en 0; si volviera a salir,
  -- se mira aparte.
  SELECT count(*) INTO v_incoherentes
    FROM public."Supplier" s
    JOIN public.companies c ON c.id = s.company_id
   WHERE s.tenant_id IS DISTINCT FROM c.tenant_id;

  IF v_incoherentes > 0 THEN
    RAISE NOTICE '043 AVISO: % proveedor(es) con tenant_id distinto del de su
      company_id. No se toca nada: la 043 no reasigna ni normaliza. Ver la 040.',
      v_incoherentes;
  END IF;

  RAISE NOTICE '043 preflight OK: % proveedores, 0 nulos, 0 huerfanas, % empresas.',
    (SELECT count(*) FROM public."Supplier"), v_empresas;
END $$;

-- ============================================================================
-- CAMBIOS
-- ============================================================================
-- Todo en una transaccion: si algo falla, no queda a medias. Un NOT NULL puesto
-- sin su FK, o al reves, deja la tabla en un estado que no queria nadie.
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. FK a companies(id).
--
-- Va PRIMERO que el NOT NULL a proposito: si la FK se crea despues, el
-- `VALIDATE` inicial ya habria recorrido la tabla. Y el orden importa tambien
-- porque un `ALTER TABLE` toma ACCESS EXCLUSIVE y dos seguidos son un solo
-- lock en vez de dos.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Preguntar "¿hay ALGUNA FK desde esta columna?" y no "¿existe ESTA FK?": el
  -- nombre del constraint puede haber cambiado, y lo que importa es que apunte
  -- a `companies`. Es el mismo criterio que uso la 041.
  IF EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN unnest(con.conkey) AS k(attnum) ON true
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid AND att.attnum = k.attnum
    JOIN pg_class rel ON rel.oid = con.confrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE con.conrelid = 'public."Supplier"'::regclass
      AND con.contype = 'f'
      AND att.attname = 'company_id'
      AND nsp.nspname = 'public'
      AND rel.relname = 'companies'
  ) THEN
    RAISE NOTICE '043: la FK company_id -> companies(id) ya existia.';
  ELSE
    ALTER TABLE public."Supplier"
      ADD CONSTRAINT supplier_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    RAISE NOTICE '043: FK company_id -> companies(id) creada con ON DELETE CASCADE.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. El NOT NULL.
--
-- Condicionado: si `attnotnull` ya esta puesto, el ALTER es un no-op y no hace
-- falta ni intentarlo (re-escribir la tabla para nada).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_ya_notnull boolean;
BEGIN
  SELECT a.attnotnull INTO v_ya_notnull
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'Supplier'
     AND a.attname = 'company_id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_ya_notnull THEN
    RAISE NOTICE '043: "Supplier"."company_id" ya era NOT NULL. No se toca.';
  ELSE
    -- El preflight ya garantizo 0 filas nulas, asi que esto no puede fallar.
    ALTER TABLE public."Supplier" ALTER COLUMN company_id SET NOT NULL;
    RAISE NOTICE '043: "Supplier"."company_id" ahora es NOT NULL.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Indices: NO se crea ninguno nuevo, y esto es un cambio de planes medido.
--
-- MEDIDO el 5 Oct 2026 con `pg_indexes` (no de memoria): `idx_supplier_company`
-- sobre `(company_id)` **ya existe**, creado por
-- `supabase/purchase-db-migration-01-company-id-text.sql:24`. Esta migracion lo
-- repite a proposito, con `IF NOT EXISTS`, para que una base recien montada
-- desde el repo no se quede sin el: si el 01 ya corrio, la linea es un no-op
-- silencioso y no falla.
--
-- Lo que SI seomia y NO va aqui: un indice compuesto `(company_id, tenant_id)`.
-- Lo estaba a punto de meter y es redundante. Motivo: **ninguna consulta de este
-- modulo filtra por los dos a la vez.** Se filtra por `company_id` y nada mas
-- (el GET ordena por `created_at`), asi que el compuesto solo se usaria como
-- prefijo de una sola columna, que es exactamente lo que ya hace
-- `idx_supplier_company`, pero pagando mas en cada escritura. Indice que nadie
-- pide, cargado en cada alta y cada edicion de proveedor.
--
-- OJO con el resto de `pg_indexes` en `Supplier`, que si es informacion util:
--   - `idx_supplier_company` y `idx_Supplier_ec136b_ci` son **el mismo indice dos
--     veces** (mismo btree sobre `company_id`, solo cambia el nombre; el segundo
--     es autogenerado). Uno sobra y se puede borrar cuando quiera: es solo
--     escritura duplicada. **Esta migracion no lo borra** porque no lo creo yo y
--     no se de donde salio;.drop de mas es peor que indice de mas.
--   - El RTN **NO es unico global**, es `UNIQUE (rtn, tenant_id)`
--     (`unique_supplier_rtn_per_tenant`). Ver la nota de arriba sobre por tenant.
--   - `email` **no tiene indice, ni unico ni no unico**: se puede repetir.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_supplier_company
  ON public."Supplier" (company_id);

COMMIT;

-- ============================================================================
-- POST-CHECK
-- ============================================================================
-- Fuera de la transaccion a proposito: ya no podria deshacer nada, asi que solo
-- mide y avisa. Las tres cosas que se comprueban:
--   1. NOT NULL puesto de verdad (leyendo pg_attribute, no creyendolo)
--   2. La FK existe y apunta a companies
--   3. Las filas siguen siendo las mismas: el conteo no debe haber cambiado
--      (esta migracion no reasigna nada, y el post-check lo comprueba)
DO $$
DECLARE
  v_notnull     boolean;
  v_tiene_fk    boolean;
  v_filas       bigint;
  v_nulos       bigint;
BEGIN
  SELECT a.attnotnull INTO v_notnull
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'Supplier'
     AND a.attname = 'company_id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF NOT v_notnull THEN
    RAISE WARNING '043: "Supplier"."company_id" sigue SIN NOT NULL. Revisar.';
  ELSE
    RAISE NOTICE '043: NOT NULL confirmado en pg_attribute.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN unnest(con.conkey) AS k(attnum) ON true
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid AND att.attnum = k.attnum
    JOIN pg_class rel ON rel.oid = con.confrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE con.conrelid = 'public."Supplier"'::regclass
      AND con.contype = 'f'
      AND att.attname = 'company_id'
      AND nsp.nspname = 'public'
      AND rel.relname = 'companies'
  ) INTO v_tiene_fk;

  IF NOT v_tiene_fk THEN
    RAISE WARNING '043: NO hay FK de company_id a companies. Revisar.';
  ELSE
    RAISE NOTICE '043: FK a companies(id) confirmada.';
  END IF;

  SELECT count(*) INTO v_filas FROM public."Supplier";
  SELECT count(*) INTO v_nulos FROM public."Supplier" WHERE company_id IS NULL;

  -- Si esto sale > 0, el NOT NULL NO esta puesto: es imposible con la columna
  -- NOT NULL, y por eso vale como comprobacion de verdad y no como teatro.
  IF v_nulos > 0 THEN
    RAISE WARNING '043: % fila(s) con company_id NULL tras la migracion.', v_nulos;
  END IF;

  RAISE NOTICE '043 listo: % proveedores, 0 nulos. Aplicacion manual en el SQL
    Editor de Supabase. Para confirmar desde fuera: company_id debe salir en el
    `required` del OpenAPI de Supplier, y un INSERT con company_id inventado debe
    dar 23503.', v_filas;
END $$;
