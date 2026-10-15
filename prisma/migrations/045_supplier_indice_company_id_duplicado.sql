-- 045: `Supplier` deja de mantener dos veces el mismo indice sobre `company_id`
--
-- QUE HACE. Deja UN SOLO indice sobre `(company_id)` (el mas completo) y borra
-- el resto. Hoy hay dos maneras de indexar la misma columna:
--
--   idx_supplier_company        el declarado en prisma/schema.prisma:349;
--                               creado por supabase/purchase-db-migration-01
--                               -company-id-text.sql:24 y repetido por la 043.
--   idx_Supplier_ec136b_ci      NO esta en el repo. Autogenerado.
--
-- MEDIDO el 5 Oct 2026 con `pg_indexes` (comentario de la 043, no de memoria):
-- los dos son btree sobre `company_id`, solo cambia el nombre. O sea que cada
-- alta, edicion y borrado de proveedor escribe `company_id` DOS veces para
-- devolver exactamente lo mismo.
--
-- QUE ES "EL MAS COMPLETO" (decision explicita, no a pelo):
--   1. No parcial (`indpred IS NULL`): un indice parcial no cubre todas las filas.
--   2. Con columnas INCLUDE (`indnatts > indnkeyatts`): sirve a mas consultas sin
--      volver a la tabla.
--   3. Empate -> el declarado en `prisma/schema.prisma`, porque es el que el
--      schema y el repo conocen: eligiendo el otro, la base y el repo discreparian
--      y `prisma migrate` volaria a "corregir"lo.
--   4. Si aun asi hay empate, ABORTA con las dos definiciones. No se adivina.
--
-- POR QUE NO SE COMPARA UNICIDAD: no puede haber un `UNIQUE` sobre
-- `company_id` aqui. Los 3 proveedores viven en la misma empresa (Empresa 1,
-- `73d5bbf7-8e47-470e-9430-da513e623ab7`), medido el 7 Oct 2026; y la 044 dio
-- 201 al dar de alta el mismo RTN en dos empresas. Si alguno de los dos fuera
-- unico, esas dos cosas no podrian ser ciertas. Por eso un indice unico que
-- apareciera aqui es una anomalIa, y la migracion aborta.
--
-- LO QUE NO TOCA: ninguna fila, ningun otro indice, ninguna constraint. Si el
-- indice que hay que borrar resultara ser el que sostiene
-- `supplier_company_id_fkey` (la FK de la 043), ABORTA en vez de borrarlo y lo
-- dice: sin ese indice la FK se queda sin apoyo. Se detecta con el SQLSTATE
-- `2BP01`, que es el de
-- `cannot drop index ... because constraint ... requires it`.
--
-- TODO EN UN SOLO BLOQUE dentro de la transaccion: la decision y el `DROP` usan
-- el MISMO codigo, asi que no pueden divergir. Si algo falla, la excepcion
-- aborta la transaccion y no se borra NADA.
--
-- IDEMPOTENTE: al segundo de correr ya solo hay un candidato y no hace nada.

-- ============================================================================
BEGIN;

DO $$
DECLARE
  v_tipo        text;
  v_n           int := 0;
  v_nombres     text[] := '{}';
  v_scores      int[]  := '{}';
  v_defs        text[] := '{}';
  v_candidato   record;
  v_score       int;
  v_min         int := NULL;
  v_empates     int;
  v_ganador_i   int := NULL;
  v_i           int;
  v_quedan      int;
  v_final       text;
  v_final_def   text;
  v_fk          text;
BEGIN
  -- ---------------------------------------------------------------------------
  -- 0. La columna tiene que existir y ser `text`, igual que en 043 y 044.
  -- ---------------------------------------------------------------------------
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_tipo
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'Supplier'
     AND a.attname = 'company_id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_tipo IS NULL THEN
    RAISE EXCEPTION '045 ABORTA: "Supplier"."company_id" no existe. Esta migracion
      da por hechas la 043 y la 044: aplicalas antes.';
  END IF;
  IF v_tipo <> 'text' THEN
    RAISE EXCEPTION '045 ABORTA: "Supplier"."company_id" es % y se esperaba text.',
      v_tipo;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 1. Cada indice de UNA sola columna `company_id`, con su puntuacion.
  --
  --    Se busca por la DEFINICION y no por el nombre, como en la 044: el nombre
  --    del duplicado no esta en el repo, asi que no hay con que buscarlo.
  --    Un indice sobre una EXPRESION (`lower(company_id)`) no entra aqui, porque
  --    `pg_get_indexdef(...,1,true)` devolveria la expresion y no `company_id`:
  --    es otro indice y no se toca.
  -- ---------------------------------------------------------------------------
  FOR v_candidato IN
    SELECT ic.relname,
           pg_get_indexdef(i.indexrelid) AS def,
           i.indisunique,
           (i.indpred IS NOT NULL)       AS parcial,
           (i.indnatts > i.indnkeyatts)  AS cubre
      FROM pg_index i
      JOIN pg_class ic ON ic.oid = i.indexrelid
      JOIN pg_class tc ON tc.oid = i.indrelid
      JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
     WHERE nsp.nspname = 'public' AND tc.relname = 'Supplier'
       AND NOT i.indisprimary
       AND i.indnkeyatts = 1
       AND pg_get_indexdef(i.indexrelid, 1, true) = 'company_id'
     ORDER BY ic.relname
  LOOP
    IF v_candidato.indisunique THEN
      RAISE EXCEPTION '045 ABORTA: % sobre "Supplier"(company_id) es UNIQUE y no
        deberia serlo: los 3 proveedores existentes comparten empresa. Definicion: %',
        v_candidato.relname, v_candidato.def;
    END IF;

    v_score := 0;
    IF v_candidato.parcial THEN v_score := v_score + 1000; END IF;
    IF v_candidato.cubre   THEN v_score := v_score - 100;  END IF;
    IF v_candidato.relname = 'idx_supplier_company'
                            THEN v_score := v_score - 10;   END IF;

    v_n       := v_n + 1;
    v_nombres := v_nombres || v_candidato.relname;
    v_scores  := v_scores  || v_score;
    v_defs    := v_defs    || v_candidato.def;

    RAISE NOTICE '045: candidato % = % (puntuacion %)',
      v_candidato.relname, v_candidato.def, v_score;

    IF v_min IS NULL OR v_score < v_min THEN
      v_min       := v_score;
      v_ganador_i := v_n;
    END IF;
  END LOOP;

  IF v_n >= 2 THEN
    SELECT count(*) INTO v_empates
      FROM unnest(v_scores) AS t(x)
     WHERE x = v_min;

    IF v_empates > 1 THEN
      RAISE EXCEPTION '045 ABORTA: % indices sobre (company_id) empatan en la
        puntuacion y no se cual es el mas completo; no se elige a azar.
        Definiciones: %', v_empates, array_to_string(v_defs, '   |||   ');
    END IF;

    -- ------------------------------------------------------------------------
    -- 2. Borrar todos menos el ganador. Cada `DROP` en su propio bloque con
    --    manejador: si Postgres dice que una constraint lo necesita, se aborta
    --    con un mensaje claro en vez de un error suelto a mitad de transaccion.
    -- ------------------------------------------------------------------------
    FOR v_i IN 1 .. v_n LOOP
      IF v_i <> v_ganador_i THEN
        BEGIN
          EXECUTE format('DROP INDEX public.%I', v_nombres[v_i]);
          RAISE NOTICE '045: borrado indice duplicado %.', v_nombres[v_i];
        EXCEPTION WHEN SQLSTATE '2BP01' THEN
          RAISE EXCEPTION '045 ABORTA: no se puede borrar % porque lo sostiene
            una constraint (2BP01). Su definicion: % . Si es la que sostiene
            supplier_company_id_fkey hay que conservar esta y borrar la otra;
            decirmelo en vez de forzarlo.', v_nombres[v_i], v_defs[v_i];
        END;
      END IF;
    END LOOP;
  ELSE
    RAISE NOTICE '045: solo % indice(s) sobre (company_id); no hay duplicado que
      limpiar. No se hace nada.', v_n;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 3. POST-CHECK: corre SIEMPRE, tambien cuando no habia nada que borrar, y
  --    mide el resultado, no el exito de la sentencia.
  --
  --    `DROP INDEX` sin encontrar su objetivo no falla, asi que "no dio error"
  --    no prueba nada: aqui se vuelve a leer `pg_index` y se exige que quede
  --    COMO MAXIMO UNO, que ademas sea el que gano, y que la FK siga en pie.
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_quedan
    FROM pg_index i
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'Supplier'
     AND NOT i.indisprimary
     AND i.indnkeyatts = 1
     AND pg_get_indexdef(i.indexrelid, 1, true) = 'company_id';

  SELECT ic.relname, pg_get_indexdef(i.indexrelid)
    INTO v_final, v_final_def
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'Supplier'
     AND NOT i.indisprimary
     AND i.indnkeyatts = 1
     AND pg_get_indexdef(i.indexrelid, 1, true) = 'company_id'
   LIMIT 1;

  IF v_quedan > 1 THEN
    RAISE EXCEPTION '045 POST-CHECK: quedan % indices de UNA columna sobre
      "Supplier"(company_id) y debia quedar como maximo 1. Revisar a mano.',
      v_quedan;
  END IF;

  IF v_n >= 2 AND v_final IS DISTINCT FROM v_nombres[v_ganador_i] THEN
    RAISE EXCEPTION '045 POST-CHECK: debia sobrevivir % y sobrevivio %. Las
      definiciones de antes eran: %',
      v_nombres[v_ganador_i], COALESCE(v_final, '<ninguno>'),
      array_to_string(v_defs, '   |||   ');
  END IF;

  SELECT con.conname INTO v_fk
    FROM pg_constraint con
   WHERE con.conrelid = 'public."Supplier"'::regclass
     AND con.contype = 'f'
   LIMIT 1;

  IF v_fk IS NULL THEN
    RAISE EXCEPTION '045 POST-CHECK: desaparecio la FK de "Supplier" a companies.
      No deberia: esta migracion no la toca.';
  END IF;

  RAISE NOTICE '045: quedan % indice(s) sobre (company_id). El que sobrevive es
    % -> %. La FK % sigue en pie.',
    v_quedan, COALESCE(v_final, '<ninguno>'), COALESCE(v_final_def, '-'), v_fk;
END $$;

COMMIT;
