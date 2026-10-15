-- 042: Calificaciones y comentarios de proveedores (`supplier_ratings`)
--
-- Que resuelve: hasta ahora `Supplier` no tenia ninguna opinion registrada.
-- Esto crea la tabla hija con la que el modal de detalle muestra el promedio,
-- los criterios y los comentarios.
--
-- POR QUE UNA TABLA NUEVA Y NO COLUMNAS EN "Supplier": el usuario pidio
-- historial (varias calificaciones por proveedor, una por persona y fecha).
-- Con columnas en "Supplier" solo cabria UNA fila por proveedor, osea que el
-- segundo voto tendria que sobrescribir al primero. Una tabla hija es lo unico
-- que da las dos cosas: el historial Y el promedio agregado.
--
-- AISLAMIENTO (AGENTS.md seccion 1): va por `company_id`, no por `tenant_id`.
-- `TEST1DS` tiene DOS empresas ("test 1" y "test 2"), asi que un filtro por
-- tenant las deja vierse las calificaciones de la otra. `company_id` es el
-- isolation key real (`companies.id`, tipo `text`).
--
-- TIPOS MEDIDOS con el OpenAPI de PostgREST el 5 Oct 2026 (NO supuestos):
--   companies.id                  -> text
--   "Supplier".id                 -> uuid      <-- NO text, aunque MASTER_SETUP diga text
--   supplier_price_history.supplier_id -> text  (drift: es la tabla de al lado)
--   "User".id                     -> text
--   "User".authid                 -> text
-- Por eso `supplier_id` aqui es **uuid** y hace FK a "Supplier"(id): seguir la
-- convencion de `Purchase.supplier_id`, que si es uuid, y NO copiar
-- `supplier_price_history.supplier_id` (text), que es drift.
--
-- ATRIBUCION: `author_id` apunta a "User"(id) (text). Se rellena en el servidor
-- con la identidad de Clerk de la sesion, NUNCA desde el cuerpo de la peticion:
-- si el cliente mandara el autor, uno podria calificar en nombre de otro.
-- El nombre que se muestra sale de "User"(firstname/lastname) en el SELECT, no de
-- una columna copiada: `User` NO tiene columna `name` (medido), tiene
-- `firstname` y `lastname`.
--
-- LO QUE ESTO NO HACE: cambiar el comportamiento de la aplicacion.
-- `lib/supabase/server-lazy.ts` usa `SUPABASE_SERVICE_ROLE_KEY`, que salta el
-- RLS por completo. El aislamiento real sigue dependiendo del
-- `.eq('company_id', empresa.companyId)` de `app/api/suppliers/ratings/route.ts`.
-- Lo que se arregla aqui es que la politica no este equivocada para el dia en
-- que alguien si dependa del RLS.
--
-- IDEMPOTENCIA: `CREATE POLICY` no admite `IF NOT EXISTS`, asi que el patron es
-- `DROP POLICY IF EXISTS` + `CREATE`. Sin los DROP, correr este archivo dos
-- veces falla con `42710 policy already exists for table`.

-- ============================================================================
-- PREFLIGHT
-- ============================================================================
DO $$
DECLARE
  v_tipo_supplier_id text;
  v_tipo_companies   text;
  v_tipo_user_id     text;
  v_ya_existe        boolean;
BEGIN
  -- La tabla no tiene que existir todavia (es una tabla NUEVA), pero si existe
  -- es que alguien la creo a mano: se avisa, no se aborta, porque el resto del
  -- archivo es idempotente y no deberia fallar por eso.
  SELECT to_regclass('public.supplier_ratings') IS NOT NULL INTO v_ya_existe;
  IF v_ya_existe THEN
    RAISE NOTICE '042: "supplier_ratings" ya existe. Se va a completar de forma idempotente.';
  END IF;

  -- Estos tres SI tienen que existir, y con ESTE tipo. Medidos en vivo.
  -- Si "Supplier" desapareciera, la FK de abajo daria 42703 al final, lejos de
  -- la causa; aqui se dice que tabla falta.
  SELECT format_type(a.atttypid, a.atttypmod)
    INTO v_tipo_supplier_id
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'Supplier'
     AND a.attname = 'id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_tipo_supplier_id IS NULL THEN
    RAISE EXCEPTION '042 ABORTA: no existe public."Supplier"."id".';
  END IF;
  IF v_tipo_supplier_id <> 'uuid' THEN
    RAISE EXCEPTION '042 ABORTA: "Supplier"."id" es %, se esperaba uuid. No lo
      cambies con ALTER sin revisar la FK de Purchase.supplier_id.', v_tipo_supplier_id;
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod)
    INTO v_tipo_companies
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'companies'
     AND a.attname = 'id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_tipo_companies IS NULL THEN
    RAISE EXCEPTION '042 ABORTA: no existe public.companies.id.';
  END IF;
  IF v_tipo_companies <> 'text' THEN
    -- `company_id` es text porque companies.id es text. SiAlguna vez se
    -- normaliza companies.id a uuid, TODAS las tablas con company_id text
    -- tienen que migrarse a la vez: declarar company_id uuid aqui solo
    -- romperia esta tabla.
    RAISE EXCEPTION '042 ABORTA: companies.id es % y company_id se declara como
      text. Revisar la migracion global de company_id antes de seguir.', v_tipo_companies;
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod)
    INTO v_tipo_user_id
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'User'
     AND a.attname = 'id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_tipo_user_id IS NULL THEN
    RAISE EXCEPTION '042 ABORTA: no existe public."User".id, que es el autor.';
  END IF;

  RAISE NOTICE '042 preflight OK: Supplier.id=uuid, companies.id=text, User.id=%', v_tipo_user_id;
END $$;

-- Todo lo de aqui abajo es una transaccion: si algo falla, `ROLLBACK` deja la
-- base como estaba. Eso es mejor que el "re-corre y se completa" de otras
-- migraciones, y es lo que hace el "no dio error" de este archivo una garantia
-- de que la tabla, las FKs, los indices, las 4 politicas y el trigger estan
-- TODOS puestos, no solo los que venían antes del fallo.
BEGIN;

-- ============================================================================
-- TABLA
-- ============================================================================
CREATE TABLE IF NOT EXISTS "supplier_ratings" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Aislamiento. company_id NOT NULL: una fila sin empresa es INVISIBLE, porque
  -- el GET filtra por `.eq('company_id', ...)`. No da error, no aparece en
  -- ningun sitio: desaparece. Es el modo de fallo mas caro, asi que se prohibe
  -- en la base y no solo en el codigo.
  company_id  text NOT NULL,
  tenant_id   text,

  -- Proveedor. uuid, NO text: ver la cabecera (medido contra la BD viva).
  supplier_id uuid NOT NULL,

  -- Quien califico. Lo escribe el servidor con la sesion de Clerk.
  author_id   text NOT NULL,

  -- Los cuatro criterios, 1..5. El "global" NO se guarda: es el promedio de
  -- estos cuatro, y se calcula al leer. Guardarlo seria una segunda fuente de
  -- verdad que se puede desincronizar de los criterios.
  quality     smallint NOT NULL,
  price       smallint NOT NULL,
  punctuality smallint NOT NULL,
  service     smallint NOT NULL,

  -- Comentario opcional: se puede calificar sin dejar texto.
  comment     text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT supplier_ratings_quality_1_5
    CHECK (quality     BETWEEN 1 AND 5),
  CONSTRAINT supplier_ratings_price_1_5
    CHECK (price       BETWEEN 1 AND 5),
  CONSTRAINT supplier_ratings_punctuality_1_5
    CHECK (punctuality BETWEEN 1 AND 5),
  CONSTRAINT supplier_ratings_service_1_5
    CHECK (service     BETWEEN 1 AND 5),

  -- El comentario se acota en la base y no solo en la API: sin esto un POST con
  -- un cuerpo enorme se acepta igual, porque el unico limite estaba en el
  -- cliente, que es lo que el usuario puede no enviar.
  CONSTRAINT supplier_ratings_comment_len
    CHECK (comment IS NULL OR char_length(comment) <= 2000)
);

-- FKs. El ON DELETE CASCADE de "Supplier" es lo que hace que al borrar un
-- proveedor no queden calificaciones apuntando a nada: el GET filtra por
-- `supplier_id`, asi que una fila huerfana no se veria, pero seguiria contando
-- en los agregados globales de la empresa.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'supplier_ratings_company_id_fkey'
       AND conrelid = 'public.supplier_ratings'::regclass
  ) THEN
    ALTER TABLE "supplier_ratings"
      ADD CONSTRAINT supplier_ratings_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    RAISE NOTICE '042: FK company_id creada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'supplier_ratings_supplier_id_fkey'
       AND conrelid = 'public.supplier_ratings'::regclass
  ) THEN
    ALTER TABLE "supplier_ratings"
      ADD CONSTRAINT supplier_ratings_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public."Supplier"(id) ON DELETE CASCADE;
    RAISE NOTICE '042: FK supplier_id creada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'supplier_ratings_author_id_fkey'
       AND conrelid = 'public.supplier_ratings'::regclass
  ) THEN
    -- Sin ON DELETE CASCADE a proposito: "User" es legacy y su `authid` puede
    -- duplicarse, asi que borrar un "User" NO debe llevarse por delante las
    -- calificaciones de una empresa (el promedio de un proveedor no puede
    -- cambiar porque se limpie una cuenta). Se borra la fila del autor a mano si
    -- hace falta, y queda el registro historico.
    ALTER TABLE "supplier_ratings"
      ADD CONSTRAINT supplier_ratings_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES public."User"(id);
    RAISE NOTICE '042: FK author_id creada (sin cascade a proposito).';
  END IF;
END $$;

-- ============================================================================
-- INDICES
-- ============================================================================
-- El GET de la ruta filtra por (company_id, supplier_id) y ordena por
-- created_at: este indice cubre ese caso sin escaneo.
CREATE INDEX IF NOT EXISTS "idx_supplier_ratings_supplier"
  ON "supplier_ratings" ("company_id", "supplier_id", "created_at" DESC);

-- El nombre para "mis calificaciones de este proveedor" y para que el servidor
-- pueda saber si el autor ya califico.
CREATE INDEX IF NOT EXISTS "idx_supplier_ratings_author"
  ON "supplier_ratings" ("author_id", "supplier_id");

-- Las 4 politicas RLS de abajo filtran por `company_id`.
CREATE INDEX IF NOT EXISTS "idx_supplier_ratings_company"
  ON "supplier_ratings" ("company_id");

-- La tabla esta vacia al crearse, asi que esto no verifica nada hoy. Se deja
-- para cuando el script se re-corra sobre una tabla ya poblada.
DO $$
DECLARE
  v_huerfanas bigint;
BEGIN
  SELECT count(*) INTO v_huerfanas
    FROM "supplier_ratings" r
   WHERE NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = r.company_id);

  IF v_huerfanas > 0 THEN
    RAISE EXCEPTION '042 ABORTA: % calificaciones con company_id que no existe en companies.', v_huerfanas;
  END IF;
  RAISE NOTICE '042 post-check OK: 0 calificaciones con empresa huerfana.';
END $$;

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE "supplier_ratings" ENABLE ROW LEVEL SECURITY;

-- El puente es `auth.uid() -> "User".authid -> user_company_access.user_id`.
-- Ojo: `user_company_access` es la fuente de verdad de la MEMBRESIA pero no de
-- la IDENTIDAD: la identidad entra por "User", que es legacy y cuyo `authid` NO
-- tiene indice unico (solo `idx_supplier_authid`). Si mañana se duplica, estas
-- politicas se vuelven sobre-permisivas (el mismo punto ciego ya documentado
-- para los importes de Transaction, aplicado a la identidad).

-- Policy: view only own companies' ratings
DROP POLICY IF EXISTS "Companies can view own supplier ratings" ON "supplier_ratings";
CREATE POLICY "Companies can view own supplier ratings" ON "supplier_ratings"
  FOR SELECT USING (company_id IN (
    SELECT uca.company_id
    FROM public.user_company_access uca
    JOIN public."User" u ON u.id = uca.user_id
    WHERE u.authid = auth.uid()::text
  ));

-- Policy: insert only into own companies, and only as yourself
--
-- El `author_id = ...` es lo que impide calificar en nombre de otro cuando se
-- llegue a depender del RLS. Sin el, la politica solo limita la EMPRESA, no
-- el AUTOR: un usuario con acceso a dos empresas podria escribir una
-- calificacion con `author_id` de alguien de la otra.
DROP POLICY IF EXISTS "Companies can insert own supplier ratings" ON "supplier_ratings";
CREATE POLICY "Companies can insert own supplier ratings" ON "supplier_ratings"
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT uca.company_id
      FROM public.user_company_access uca
      JOIN public."User" u ON u.id = uca.user_id
      WHERE u.authid = auth.uid()::text
    )
    AND author_id IN (
      SELECT u.id FROM public."User" u WHERE u.authid = auth.uid()::text
    )
  );

-- Policy: update only own companies, and only own ratings
DROP POLICY IF EXISTS "Companies can update own supplier ratings" ON "supplier_ratings";
CREATE POLICY "Companies can update own supplier ratings" ON "supplier_ratings"
  FOR UPDATE USING (
    company_id IN (
      SELECT uca.company_id
      FROM public.user_company_access uca
      JOIN public."User" u ON u.id = uca.user_id
      WHERE u.authid = auth.uid()::text
    )
    AND author_id IN (
      SELECT u.id FROM public."User" u WHERE u.authid = auth.uid()::text
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT uca.company_id
      FROM public.user_company_access uca
      JOIN public."User" u ON u.id = uca.user_id
      WHERE u.authid = auth.uid()::text
    )
    AND author_id IN (
      SELECT u.id FROM public."User" u WHERE u.authid = auth.uid()::text
    )
  );

-- Policy: delete only own companies, and only own ratings
DROP POLICY IF EXISTS "Companies can delete own supplier ratings" ON "supplier_ratings";
CREATE POLICY "Companies can delete own supplier ratings" ON "supplier_ratings"
  FOR DELETE USING (
    company_id IN (
      SELECT uca.company_id
      FROM public.user_company_access uca
      JOIN public."User" u ON u.id = uca.user_id
      WHERE u.authid = auth.uid()::text
    )
    AND author_id IN (
      SELECT u.id FROM public."User" u WHERE u.authid = auth.uid()::text
    )
  );

-- `created_at` se actualiza en cada PATCH.
CREATE OR REPLACE FUNCTION public.touch_supplier_ratings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_supplier_ratings_updated_at" ON "supplier_ratings";
CREATE TRIGGER "trg_supplier_ratings_updated_at"
  BEFORE UPDATE ON "supplier_ratings"
  FOR EACH ROW EXECUTE FUNCTION public.touch_supplier_ratings_updated_at();

COMMIT;

-- ============================================================================
-- POST-CHECK FINAL
-- ============================================================================
-- Fuera de la transaccion a proposito: esto no modifica nada, solo mide. Y va
-- fuera porque un `RAISE EXCEPTION` aqui ya no podria deshacer lo de arriba (la
-- transaccion esta cerrada), asi que solo sirve para LEER el estado final y
-- avisar: el abort que de verdad protege es el del preflight, no este.
DO $$
DECLARE
  v_filas    bigint;
  v_policies bigint;
  v_indices  bigint;
BEGIN
  SELECT count(*) INTO v_filas FROM public.supplier_ratings;

  SELECT count(*) INTO v_policies
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'supplier_ratings';

  SELECT count(*) INTO v_indices
    FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'supplier_ratings';

  RAISE NOTICE '042: "supplier_ratings" creada. Filas=% politicas=% indices=%',
    v_filas, v_policies, v_indices;

  IF v_policies <> 4 THEN
    RAISE WARNING '042: se esperaban 4 politicas RLS y hay %. Revisar.', v_policies;
  END IF;

  RAISE NOTICE '042 listo. Aplicacion manual en el SQL Editor de Supabase.';
END $$;