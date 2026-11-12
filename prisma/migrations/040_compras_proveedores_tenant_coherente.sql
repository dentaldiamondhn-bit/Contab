-- ============================================================================
-- 040 - Compras/Proveedores: alinear tenant_id con el de su company_id
-- ----------------------------------------------------------------------------
-- APLICADA EN EL SQL EDITOR DE SUPABASE EL 2 Oct 2026. Corrio sin error.
--
-- VERIFICADA DESDE FUERA con 3 consultas de solo lectura (ver `CLAUDE.md`):
--   - 0 filas incoherentes en las 5 tablas (tenant_id IS DISTINCT FROM el de
--     su company_id).
--   - DICOSA (693af3cd-ef07-457e-b001-a274417bc110) con tenant_id='1', que es
--     lo que la 040 pretendia cerrar: venia en 'ANGELOH7' con company_id de
--     Empresa 1.
--   - Empresa 1 conserva 2 Purchase y 3 Supplier. El 3 son los 2 de
--     tenant_id='1' mas DICOSA, que ya era de Empresa 1 por company_id. El mismo
--     dato da 2 o 3 segun la columna que se cuente, y ambos numeros son
--     correctos.
--
-- ESTA ES UNA COPIA: volver a ejecutarla es inofensivo porque su post-check
-- aborta si queda alguna incoherencia y el UPDATE solo toca filas donde
-- `tenant_id` difiere del de su `company_id`. Aun asi, las migraciones no se
-- re-aplican por costumbre: el registro de lo aplicado vive en `CLAUDE.md`.
--
-- CONTEXTO
-- `lib/purchase-db.ts` exportaba `TENANT_ID = '1'` y lo aplicaba a TODAS sus
-- consultas. Eso no era solo un bug de alcance: hacia que las 8 rutas de
-- /api/purchases y /api/suppliers operaran siempre sobre el tenant '1'. Ya se
-- corrigio en codigo (ahora el aislamiento es por `company_id`, con la empresa
-- validada por `contextoDeEmpresa`).
--
-- Esta migracion NO hace falta para arreglar esa fuga: es la limpieza de los
-- datos que quedaron incoherentes, y un candado para que no vuelvan.
--
-- QUE HACE Y QUE NO HACE
-- NO reasigna empresas. NO toca `company_id`. NO mueve filas entre empresas.
-- Solo sincroniza el `tenant_id` de una fila CON el tenant de la empresa que esa
-- fila ya declara en `company_id`, y solo cuando las dos cosas se contradicen.
--
-- POR QUE `company_id` GANA Y `tenant_id` PIERDE
-- Es la direccion que ya establecio la 027b con evidencia, no una suposicion:
-- `Transaction`, `Supplier` y `Account` traian `company_id` mal (codigos de
-- tenant o el id de otra empresa) y la 027b los reparo desde el dato confiable.
-- Medido despues: `Supplier` 3/3 coherentes, `Purchase` 2/2, `Invoice` 3/3,
-- `Account` 35/35. El `tenant_id` es el que quedo viejo:
--
--   - `DICOSA` / "Distrubidora Comercial SA" (693af3cd-ef07-457e-b001-a274417bc110):
--     la 027b2 la atribujo a Empresa 1 por sus 2 `Purchase`, porque
--     `Purchase.company_id` si era confiable, pero su `tenant_id` sigue en
--     'ANGELOH7'. Es el caso que dispara esta migracion.
--
-- MEDIDO ANTES DE ESCRIBIR ESTO (2 Oct 2026, PostgREST)
--   Empresa 1 = 73d5bbf7-8e47-470e-9430-da513e623ab7, tenant_id '1'
--   Filas con tenant_id='1' -> 2 Purchase, 2 Supplier, 3 PurchaseItem,
--     6 product, 1 warehouse, 22 Account, 1 Customer.
--   TODAS tienen company_id = Empresa 1. Osea que la fuga de codigo no habia
--   dejado compras de una empresa etiquetadas como de otra: no hay nada que
--   reasignar, solo que normalizar.
--
-- Lo que NO se toca:
--   - Filas con `company_id` NULL: no hay empresa que sea la verdad, y rellenar
--     el tenant seria inventar. `Transaction` 051e950a sigue asi a proposito.
--   - Filas cuyo `company_id` no resuelve a ninguna fila de `companies`: mismo
--     motivo (se avisan con NOTICE, no se adivinan).
--   - El unique `unique_code_tenant` de `Account`: no se toca ningun indice.
--
-- REVISADO TRAS UN PRIMER INTENTO FALLIDO (2 Oct 2026)
-- La primera version se ejecuto y fallo:
--   ERROR: 0A000: EXECUTE of SELECT ... INTO is not implemented
--   CONTEXT: PL/pgSQL function inline_code_block line 8 at EXECUTE
-- El bloque 1 (el de inventario) tenia el `INTO` DENTRO de la cadena
-- dinamica:
--     EXECUTE format($f$ SELECT count(*) INTO v_n FROM public.%I ... $f$, v_tabla);
-- `EXECUTE` no implementa `SELECT ... INTO` (solo `EXECUTE ... INTO`, o
-- `EXECUTE CREATE TABLE ... AS`), asi que la linea 8 del `DO` reventaba.
-- El `INTO` va fuera, como ya estaba bien en los bloques 3 y del post-check:
--     EXECUTE format($f$ SELECT count(*) FROM public.%I ... $f$, v_tabla) INTO v_n;
--
-- **Lo que no lo habria detectado:** la validacion estructural previa conto 5
-- bloques DO, 6 usos de `%I` y dio "0 problemas" con la migracion rota. Miraba
-- la FORMA, no si el SQL dentro de las cadenas era ejecutable. Ese falso verde es
-- el que hay que evitar: `node scripts/validar-040.mjs` comprueba ahora, entre
-- otras cosas, que no haya ningun `INTO` dentro de una cadena `$f$`.
--
-- La transaccion fallo en el bloque 1, ANTES del UPDATE del bloque 2, asi que no
-- llego a escribirse nada. Aun asi, al re-ejecutarla hay que leer los NOTICE: dan
-- el conteo por tabla, que es la unica prueba de que el UPDATE ocurrio.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Bloque 0: preflight. Medir el estado real y abortar si el esquema no es el
-- que creemos, ANTES de escribir nada. Un UPDATE sobre una columna que no existe
-- falla lejos de su causa.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_company text := '73d5bbf7-8e47-470e-9430-da513e623ab7';
  v_tabla   text;
  v_faltan  text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = v_company) THEN
    RAISE EXCEPTION '040: no existe la empresa % en companies', v_company;
  END IF;

  -- Las 5 tablas que el modulo de compras/proveedores toca.
  FOREACH v_tabla IN ARRAY ARRAY['Purchase','PurchaseItem','Supplier','SupplierPayment','supplier_price_history']
  LOOP
    IF to_regclass(format('public.%I', v_tabla)) IS NULL THEN
      RAISE EXCEPTION '040: no existe la tabla public.%', v_tabla;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v_tabla AND column_name = 'company_id'
    ) THEN
      v_faltan := coalesce(v_faltan || ', ', '') || v_tabla || '.company_id';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v_tabla AND column_name = 'tenant_id'
    ) THEN
      v_faltan := coalesce(v_faltan || ', ', '') || v_tabla || '.tenant_id';
    END IF;
  END LOOP;

  IF v_faltan IS NOT NULL THEN
    RAISE EXCEPTION '040: faltan columnas esperadas: %', v_faltan;
  END IF;

  -- `to_regclass` con un identificador sin comillas lo pliega a minusculas y
  -- devuelve NULL aunque el objeto exista. Por eso el preflight de la 027 usa
  -- `pg_class`. Aqui ya se comprobo cada columna en information_schema, que no
  -- sufre el plegado, asi que no hace falta el JOIN.
  RAISE NOTICE '040: preflight OK - Empresa 1 existe y las 5 tablas company_id + tenant_id';
END $$;

-- ---------------------------------------------------------------------------
-- Bloque 1: inventario de las contradicciones, antes de tocarlas.
-- Mismo criterio para las 5 tablas: la fila dice una empresa (company_id) y un
-- tenant (tenant_id) que no coinciden con el de esa empresa.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tabla text;
  v_n     int;
BEGIN
  FOREACH v_tabla IN ARRAY ARRAY['Purchase','PurchaseItem','Supplier','SupplierPayment','supplier_price_history']
  LOOP
    -- El `INTO` va FUERA del `EXECUTE`. Si se deja dentro de la cadena, el
    -- `EXECUTE` intenta correr `SELECT ... INTO` como SQL plano y revienta con
    -- `0A000: EXECUTE of SELECT ... INTO is not implemented`.
    EXECUTE format($f$
      SELECT count(*)
      FROM public.%I r
      JOIN public.companies c ON c.id = r.company_id
      WHERE r.company_id IS NOT NULL
        AND r.tenant_id IS DISTINCT FROM c.tenant_id
    $f$, v_tabla) INTO v_n;

    IF v_n > 0 THEN
      RAISE NOTICE '040: % tiene % fila(s) con tenant_id distinto del de su company_id', v_tabla, v_n;
    ELSE
      RAISE NOTICE '040: % ya coherente', v_tabla;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Bloque 2: la reparacion. Solo `tenant_id`, y solo donde `company_id` resuelve
-- a una empresa real. Se usa `IS DISTINCT FROM` porque `tenant_id` puede ser
-- NULL: con `<>` un NULL da NULL (no TRUE) y el WHERE descartaria la fila, que
-- es justo el fallo que hizo que la 028 no rellenara nada.
--
-- El company_id NO se toca en ninguna linea: no es lo que esta mal.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tabla text;
  v_n     int;
BEGIN
  FOREACH v_tabla IN ARRAY ARRAY['Purchase','PurchaseItem','Supplier','SupplierPayment','supplier_price_history']
  LOOP
    EXECUTE format($f$
      UPDATE public.%I r
      SET tenant_id = c.tenant_id
      FROM public.companies c
      WHERE c.id = r.company_id
        AND r.tenant_id IS DISTINCT FROM c.tenant_id
    $f$, v_tabla);

    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE '040: % - % fila(s) actualizadas', v_tabla, v_n;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Bloque 3: filas huerfanas. NO se reparan: no hay empresa de la que deducir el
-- tenant. Se avisan para que la decision sea explicita y no heredada.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tabla text;
  v_n     int;
BEGIN
  FOREACH v_tabla IN ARRAY ARRAY['Purchase','PurchaseItem','Supplier','SupplierPayment','supplier_price_history']
  LOOP
    EXECUTE format($f$
      SELECT count(*) FROM public.%I r
      WHERE r.company_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = r.company_id)
    $f$, v_tabla) INTO v_n;

    IF v_n > 0 THEN
      RAISE NOTICE '040: ATENCION % - % fila(s) con company_id que no existe en companies. NO se tocaron.', v_tabla, v_n;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Post-check. Una migracion de solo UPDATE necesita medir su resultado: si no,
-- no distingue "ya estaba bien" de "no hizo nada". Si queda alguna
-- contradiccion resoluble, ABORTA.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tabla text;
  v_quedan int;
  v_total  int;
BEGIN
  FOREACH v_tabla IN ARRAY ARRAY['Purchase','PurchaseItem','Supplier','SupplierPayment','supplier_price_history']
  LOOP
    EXECUTE format($f$
      SELECT count(*) FROM public.%I r
      JOIN public.companies c ON c.id = r.company_id
      WHERE r.company_id IS NOT NULL
        AND r.tenant_id IS DISTINCT FROM c.tenant_id
    $f$, v_tabla) INTO v_quedan;

    IF v_quedan > 0 THEN
      RAISE EXCEPTION '040: % sigue con % fila(s) incoherentes', v_tabla, v_quedan;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I', v_tabla) INTO v_total;
    RAISE NOTICE '040: OK % - % fila(s) totales, 0 incoherentes', v_tabla, v_total;
  END LOOP;

  -- Comprobacion explicita de DICOSA, que era el caso conocido.
  IF EXISTS (
    SELECT 1 FROM public."Supplier"
    WHERE id = '693af3cd-ef07-457e-b001-a274417bc110'
      AND tenant_id IS DISTINCT FROM '1'
  ) THEN
    RAISE NOTICE '040: DICOSA sigue con tenant_id distinto de 1 (revisar: sus 2 Purchase siguen en Empresa 1)';
  ELSE
    RAISE NOTICE '040: OK - DICOSA coherente con Empresa 1';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICACION DESDE FUERA (no confiar en el "Success" del SQL Editor):
--
--   -- Debe dar 0. Cualquier valor > 0 es una fuga que queda viva.
--   SELECT 'Purchase' t, count(*) FROM public."Purchase" r
--     JOIN public.companies c ON c.id = r.company_id
--    WHERE r.tenant_id IS DISTINCT FROM c.tenant_id
--   UNION ALL SELECT 'PurchaseItem', count(*) FROM public."PurchaseItem" r
--     JOIN public.companies c ON c.id = r.company_id
--    WHERE r.tenant_id IS DISTINCT FROM c.tenant_id
--   UNION ALL SELECT 'Supplier', count(*) FROM public."Supplier" r
--     JOIN public.companies c ON c.id = r.company_id
--    WHERE r.tenant_id IS DISTINCT FROM c.tenant_id
--   UNION ALL SELECT 'SupplierPayment', count(*) FROM public."SupplierPayment" r
--     JOIN public.companies c ON c.id = r.company_id
--    WHERE r.tenant_id IS DISTINCT FROM c.tenant_id
--   UNION ALL SELECT 'supplier_price_history', count(*) FROM public.supplier_price_history r
--     JOIN public.companies c ON c.id = r.company_id
--    WHERE r.tenant_id IS DISTINCT FROM c.tenant_id;
--
--   -- Empresa 1 debe seguir teniendo exactamente sus 2 compras y 2 proveedores.
--   SELECT count(*) FROM public."Purchase" WHERE company_id = '73d5bbf7-8e47-470e-9430-da513e623ab7';
--   SELECT count(*) FROM public."Supplier" WHERE company_id = '73d5bbf7-8e47-470e-9430-da513e623ab7';
-- ============================================================================