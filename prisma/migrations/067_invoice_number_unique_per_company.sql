-- 067 — La serie de factura es unica POR EMPRESA (`company_id`), no por tenant
--
-- QUE ARREGLA. La 022 cambio el UNIQUE global `Invoice_invoiceNumber_key` por
-- `Invoice_tenantId_invoiceNumber_key`, con el razonamiento correcto ("la
-- numeracion fiscal va por emisor") pero la columna equivocada: uso `tenantId`.
-- El tenant no es la frontera de este proyecto: `TEST1DS` tiene DOS empresas
-- (test 1 `8143dd4e-...` y test 2 `971bec43-...`) que no comparten nada. Con el
-- UNIQUE por tenant, test 1 y test 2 NO pueden tener las dos el 001-01-01-00000001,
-- aunque son emisores distintos con su propio CAI y su propia serie.
--
-- Medido antes de escribir esto (8 Oct 2026, service_role):
--   - `cai`: 3 filas, TODAS con `company_id` real (2 de la empresa de tenant "1",
--     1 de test 1). `company_id` es nullable pero ninguna fila lo tiene nulo.
--   - `Invoice`: 2 filas, ambas `tenantId='ANGELOH7'`, `company_id` de la empresa
--     de Angelos (00000006, 00000007). 0 filas con `company_id` NULL.
--   - el codigo ya trata la serie por empresa desde siempre
--     (`lib/billing/invoice-number.ts` filtra por `company_id`), asi que la base
--     era la que estaba desalineada.
--
-- OJO (error pagado el 8 Oct 2026, primer intento): `pg_get_indexdef(oid, n, true)`
-- **entrecomilla los identificadores con mayusculas**. Para la columna `invoiceNumber`
-- devuelve `"invoiceNumber"` (con comillas dobles), NO `invoiceNumber`. Comparar
-- `= 'invoiceNumber'` NO matchea nunca: el preflight no veia el UNIQUE viejo (y no lo
-- dropeaba) y el post-check no veia el nuevo (y abortaba, dejando los dos indices).
-- Es la misma trampa que el plegado de `to_regclass` con mayusculas. Por eso todo el
-- cruce de nombres va con `btrim(pg_get_indexdef(...), '"')`.
--
-- A PARTIR DE AQUI la unicidad real pasa a ser
-- `UNIQUE("company_id", "invoiceNumber")`. Coincide con lo que ya hace
-- `lib/billing/invoice-number.ts` (busca la ultima factura de la MISMA empresa y
-- el CAI de esa empresa) y con `UNIQUE("company_id", "cost_type", "cost_key")`
-- de la 051: la frontera es `company_id`.
--
-- LO QUE NO HACE: no toca ninguna fila. Es schema puro. No anade `NOT NULL` a
-- `company_id` (la columna ya existe desde la 023 y hoy no hay NULL, pero forzarlo
-- es otra decision); el preflight aborta si apareciera un NULL, para no crear un
-- UNIQUE que no proteja una fila.
--
-- IDEMPOTENTE y con comprobacion de que dropea algo. Un `DROP` que no encuentra su
-- objetivo no falla: seguiria dando "Success" con la restriccion vieja viva, y
-- test 1 y test 2 seguirian chocando con 23505 al emitir el mismo correlativo. Por
-- eso el post-check lee `pg_index` (no `pg_constraint`: un `@unique` de Prisma es
-- un INDICE) y ABORTA si el UNIQUE viejo sigue o si falta el nuevo.

-- ============================================================================
-- PREFLIGHT
-- ============================================================================
DO $$
DECLARE
  v_existe_tabla  boolean;
  v_tipo_empresa  text;
  v_nulos         bigint;
  v_dupes         text;
  v_viejo_def     text;
  v_global_def    text;
  v_nuevo_def     text;
BEGIN
  -- La tabla y la columna tienen que existir.
  SELECT to_regclass(format('public.%I', 'Invoice')) IS NOT NULL INTO v_existe_tabla;
  IF NOT v_existe_tabla THEN
    RAISE EXCEPTION '067 ABORTA: no existe la tabla public."Invoice".';
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v_tipo_empresa
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'Invoice'
     AND a.attname = 'company_id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_tipo_empresa IS NULL THEN
    RAISE EXCEPTION '067 ABORTA: "Invoice"."company_id" no existe. La 023 deberia
      haberla creado; aplicala antes.';
  END IF;

  -- Un UNIQUE con NULL no protege: NULL es distinto de NULL, asi que dos filas
  -- con company_id NULL podrian repetir numero sin chocar. Si hubiera una,
  -- se aborta en vez de crear un indice que no cubre.
  SELECT count(*) INTO v_nulos FROM public."Invoice" WHERE "company_id" IS NULL;
  IF v_nulos > 0 THEN
    RAISE EXCEPTION '067 ABORTA: % facturas con "company_id" NULL. Atribuyelas a
      su empresa (backfill) antes de cambiar el UNIQUE.', v_nulos;
  END IF;

  -- Duplicados por empresa: si hay, el CREATE UNIQUE falla a mitad.
  SELECT string_agg(d, '; ') INTO v_dupes FROM (
    SELECT format('%s / %s (x%s)', "company_id", "invoiceNumber", n) AS d
    FROM (
      SELECT "company_id", "invoiceNumber", count(*) AS n
      FROM "Invoice"
      GROUP BY "company_id", "invoiceNumber"
      HAVING count(*) > 1
    ) q
  ) s;
  IF v_dupes IS NOT NULL THEN
    RAISE EXCEPTION '067 ABORTA: facturas duplicadas por empresa: %', v_dupes;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Localizar el UNIQUE viejo (tenantId, invoiceNumber) POR COLUMNAS, no por
  -- nombre. El nombre del constraint puede no ser el del indice (leccion de la
  -- 044/051).
  -- ---------------------------------------------------------------------------
  SELECT pg_get_indexdef(i.indexrelid) INTO v_viejo_def
    FROM pg_index i
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'Invoice'
     AND i.indisunique AND i.indnkeyatts = 2
     AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'tenantId'
     AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'invoiceNumber'
   LIMIT 1;
  IF v_viejo_def IS NULL THEN
    RAISE NOTICE '067: no hay UNIQUE (tenantId, invoiceNumber). Nada que cambiar.';
  ELSE
    RAISE NOTICE '067: UNIQUE viejo encontrado: %', v_viejo_def;
  END IF;

  -- Si todavia viviera el UNIQUE global (la 022 no aplicada), la migracion no
  -- arreglaria el problema: dos empresas seguirian sin poder repetir numero.
  SELECT pg_get_indexdef(i.indexrelid) INTO v_global_def
    FROM pg_index i
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'Invoice'
     AND i.indisunique AND i.indnkeyatts = 1
     AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'invoiceNumber'
   LIMIT 1;
  IF v_global_def IS NOT NULL THEN
    RAISE EXCEPTION '067 ABORTA: sigue vivo un UNIQUE global sobre invoiceNumber (%).
      Aplica la 022_invoice_number_unique_per_tenant.sql antes.', v_global_def;
  END IF;

  SELECT pg_get_indexdef(i.indexrelid) INTO v_nuevo_def
    FROM pg_index i
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'Invoice'
     AND i.indisunique AND i.indnkeyatts = 2
     AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'company_id'
     AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'invoiceNumber'
   LIMIT 1;
  IF v_nuevo_def IS NOT NULL THEN
    RAISE NOTICE '067: el UNIQUE por empresa YA existe: %', v_nuevo_def;
  END IF;
END $$;

-- ============================================================================
-- CAMBIOS
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Fuera el UNIQUE (tenantId, invoiceNumber). Se baja el CONSTRAINT si el
--    indice lo sostiene, o el indice si es suelto. `DROP INDEX` sobre un indice
--    de constraint aborta la transaccion, por eso los dos caminos.
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
   WHERE nsp.nspname = 'public' AND tc.relname = 'Invoice'
     AND i.indisunique AND i.indnkeyatts = 2
     AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'tenantId'
     AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'invoiceNumber'
   LIMIT 1;

  IF v_con_nombre IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public."Invoice" DROP CONSTRAINT %I', v_con_nombre);
    v_dropeo := 'CONSTRAINT ' || v_con_nombre;
  ELSE
    SELECT ic.relname INTO v_ind_nombre
      FROM pg_index i
      JOIN pg_class ic ON ic.oid = i.indexrelid
      JOIN pg_class tc ON tc.oid = i.indrelid
      JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
     WHERE nsp.nspname = 'public' AND tc.relname = 'Invoice'
       AND i.indisunique AND i.indnkeyatts = 2
       AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'tenantId'
       AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'invoiceNumber'
     LIMIT 1;
    IF v_ind_nombre IS NOT NULL THEN
      EXECUTE format('DROP INDEX public.%I', v_ind_nombre);
      v_dropeo := 'INDEX ' || v_ind_nombre;
    END IF;
  END IF;

  IF v_dropeo = 'nada' THEN
    RAISE NOTICE '067: no habia UNIQUE (tenantId, invoiceNumber) que borrar.';
  ELSE
    RAISE NOTICE '067: borrado %.', v_dropeo;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. El UNIQUE correcto: la serie es por empresa. Solo si no existe ya.
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
     WHERE nsp.nspname = 'public' AND tc.relname = 'Invoice'
       AND i.indisunique AND i.indnkeyatts = 2
       AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'company_id'
       AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'invoiceNumber'
  ) INTO v_existe;

  IF v_existe THEN
    RAISE NOTICE '067: el UNIQUE por empresa ya existe; no se crea de nuevo.';
  ELSE
    CREATE UNIQUE INDEX "Invoice_company_id_invoiceNumber_key"
      ON public."Invoice" ("company_id", "invoiceNumber");
    RAISE NOTICE '067: creado "Invoice_company_id_invoiceNumber_key".';
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
  SELECT ic.relname INTO v_viejo
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'Invoice'
     AND i.indisunique AND i.indnkeyatts = 2
     AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'tenantId'
     AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'invoiceNumber'
   LIMIT 1;

  -- El UNIQUE viejo NO debe quedar: si el DROP no encontro su objetivo, seguiria
  -- vivo y test 1/test 2 chocarian igual.
  IF v_viejo IS NOT NULL THEN
    RAISE EXCEPTION '067 FALLA: sigue el UNIQUE viejo sobre (tenantId, invoiceNumber): %',
      v_viejo;
  END IF;

  -- El UNIQUE nuevo DEBE estar.
  IF NOT EXISTS (
    SELECT 1
      FROM pg_index i
      JOIN pg_class tc ON tc.oid = i.indrelid
      JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
     WHERE nsp.nspname = 'public' AND tc.relname = 'Invoice'
       AND i.indisunique AND i.indnkeyatts = 2
       AND btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'company_id'
       AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'invoiceNumber'
  ) THEN
    RAISE EXCEPTION '067 FALLA: no quedo el UNIQUE (company_id, invoiceNumber).';
  END IF;

  SELECT count(*) INTO v_nulos FROM public."Invoice" WHERE "company_id" IS NULL;
  IF v_nulos > 0 THEN
    RAISE EXCEPTION '067 FALLA: % facturas sin company_id; el UNIQUE no las cubre.',
      v_nulos;
  END IF;

  RAISE NOTICE '067 OK: la serie de factura es unica por empresa (company_id,
    invoiceNumber). Verificado en pg_index.';
END $$;
