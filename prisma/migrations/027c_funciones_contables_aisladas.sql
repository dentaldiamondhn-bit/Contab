-- =============================================================================
-- 027c · AISLAR LAS 8 FUNCIONES CONTABLES
-- =============================================================================
-- Cierra el agujero que la 027 dejo abierto: las vistas quedaron aisladas por
-- `company_id`, pero `integrated-books/route.ts` llama a las FUNCIONES, que son
-- otra implementacion paralela de los mismos reportes y no estaban aisladas.
--
-- MEDIDO, no supuesto (cuerpos sacados con pg_get_functiondef):
--
--   funcion                               security definer  filtra por empresa  /100
--   ------------------------------------- ------------------ -------------------- -----
--   get_libro_diario_integrado            si                 NO                   si
--   get_libro_mayor_integrado             si                 NO                   si
--   get_balance_comprobacion_integrado    si                 NO                   si
--   get_resumen_ingresos_egresos          si                 NO                   si
--   get_egresos_with_entries              si                 NO                   no
--   get_ingresos_with_entries             no                 NO                   no
--   get_accounts_with_opening_balances    no                 NO                   no
--   update_opening_balances               no                 NO                   no
--
-- Los tres fallos que se corrigen:
--
-- 1) TODAS aceptan `p_tenant_id DEFAULT NULL`, y sin argumento no filtran nada:
--    el `(p_tenant_id IS NULL OR ...)` se cumple siempre. Se llama con tenant
--    sufijo, asi que con `TEST1DS` (test 1 y test 2) las dos empresas se suman.
--
-- 2) `get_libro_mayor_integrado` y `get_balance_comprobacion_integrado` tienen
--    `LEFT JOIN "JournalEntry"` con los filtros de tenant y fecha en el WHERE.
--    En un LEFT JOIN, un filtro en el WHERE lo convierte en INNER y desaparece
--    la cuenta sin movimientos. Lo parchean con `OR t."tenantId" IS NULL` /
--    `OR t.date IS NULL`, que no es lo mismo: deja pasar al ASIENTO de una cuenta
--    cuya transaccion es de otra empresa. Los filtros van al ON, como en la 027.
--
-- 3) `update_opening_balances` es de ESCRITURA y PostgREST la expone. Aceptaba
--    `p_tenant_id` del cliente y escribia en cualquier tenant. Con un tenant de
--    dos empresas, escribia en las dos. Ademas `EXECUTE` para PUBLIC por defecto
--    significa que tambien la podia llamar la anon key.
--
-- MEDIDO de las tablas de fondo:
--   - `transactionId` y `accountId` de JournalEntry: 101/101 pobladas.
--     `transaction_id`, `account_id`, `transactionid`, `accountid`: 0/101. Los
--     JOIN de estas funciones usan las columnas correctas.
--   - `chart_of_accounts` (89 filas, tenants 1 y cVcLafoZ) NO es `"Account"`
--     (43 filas, tenants 1 y ANGELOH7). Son dos planes de cuentas distintos que
--     solo comparten Empresa 1. Las 2 funciones de saldos iniciales works sobre
--     la legacy; los 4 libros sobre `"Account"`. Ambas tienen `company_id`.
--
-- LO QUE ESTA MIGRACION NO TOCA: el `/100`. `JournalEntry.amount` tiene
-- unidades mezcladas segun el flujo que escribio la fila, asi que dividir es
-- correcto para unas y esta mal para otras. Arreglar eso es una decision de
-- datos aparte, no de aislamiento. Los cuerpos se copian tal cual.
--
-- Se `DROP`ea y se vuelve a crear cada funcion en vez de `CREATE OR REPLACE`:
-- cambiar los parametros o el tipo de retorno con OR REPLACE no reemplaza nada,
-- crea un OVERLOAD nuevo y deja la vieja filtrando a la vista. El `RETURNS
-- TABLE` tambien cambia (se anade `company_id`), y Postgres no permite alterarlo.
--
-- Las 4 vistas wrapper se BORRAN. `docs/SEGURIDAD_CONTROL_REPORT.md:352` confirma
-- con `pg_class` que `relkind = view` (no materializadas), asi que `DROP VIEW`
-- aplica. Tenian 0 consumidores en `app/`.
--
-- Sobre su exposicion, sin exagerar: la V4 ya habia hecho
-- `REVOKE ALL ... FROM anon, authenticated, PUBLIC` sobre 3 de ellas
-- (`libro_diario_integrado`, `libro_egresos`, `resumen_ingresos_egresos`).
-- **`libro_ingresos` se quedo fuera de esa lista.** Y ese REVOKE solo cerraba
-- PostgREST para anon/authenticated: no hacia nada contra `service_role`, que es
-- con lo que corre la app, ni contra el hecho de que la vista devuelva TODAS las
-- empresas sin filtro. Ademas, aunque quedaran cerradas, seguirian siendo 4 copias
-- duplicadas de SQL contable que nadie usa y que pueden divergir sin avisar.
-- Lo que de verdad no estaba cerrado son las FUNCIONES: la V4 no las toca.
-- =============================================================================


BEGIN;


-- -----------------------------------------------------------------------------
-- 0. Preflight: que esten las 8 funciones y las 4 vistas, antes de tocar nada
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    v     text;
    v_n   integer;
    v_vista text;
    v_ret text;
BEGIN
    FOREACH v IN ARRAY ARRAY[
        'get_libro_diario_integrado', 'get_libro_mayor_integrado',
        'get_balance_comprobacion_integrado', 'get_resumen_ingresos_egresos',
        'get_egresos_with_entries', 'get_ingresos_with_entries',
        'get_accounts_with_opening_balances', 'update_opening_balances'
    ] LOOP
        SELECT count(*) INTO v_n
          FROM pg_proc p
          JOIN pg_namespace ns ON ns.oid = p.pronamespace
         WHERE ns.nspname = 'public' AND p.proname = v;

        IF v_n = 0 THEN
            RAISE EXCEPTION '027c: public.% no existe. El esquema cambio; revisar antes de aplicar.', v;
        END IF;
        IF v_n > 1 THEN
            RAISE NOTICE '027c: OJO, public.% tiene % overloads. Se dropean todos.', v, v_n;
        END IF;

        -- Se vuelca la firma de retorno ACTUAL. Los `RETURNS TABLE` de abajo son
        -- copias del cuerpo original (sacado con pg_get_functiondef), pero si un
        -- tipo se transcripo mal el CREATE no se queja: revienta al llamar, en el
        -- bloque 6a, al final de la migracion y lejos de la causa. Con esta linea
        -- se puede comparar en caliente.
        --
        -- OJO: el valor va en una variable y no dentro del RAISE. La gramática de
        -- plpgsql (`raise_stmt` -> `extended_expr_list`) solo admite expresiones
        -- separadas por comas: un `FROM ... WHERE ... LIMIT` ahi se parsea como
        -- parametros extra y falla con "too many parameters specified for RAISE".
        SELECT pg_get_function_result(p.oid) INTO v_ret
          FROM pg_proc p
          JOIN pg_namespace ns ON ns.oid = p.pronamespace
         WHERE ns.nspname = 'public' AND p.proname = v
         ORDER BY p.oid
         LIMIT 1;

        RAISE NOTICE '027c: % -> %', v, v_ret;
    END LOOP;

    FOREACH v_vista IN ARRAY ARRAY[
        'libro_diario_integrado', 'libro_egresos',
        'libro_ingresos', 'resumen_ingresos_egresos'
    ] LOOP
        IF to_regclass(format('public.%I', v_vista)) IS NULL THEN
            RAISE EXCEPTION '027c: la vista public.% no existe. El esquema cambio.', v_vista;
        END IF;
    END LOOP;

    RAISE NOTICE '027c: preflight ok, 8 funciones y 4 vistas presentes';
END $$;


-- -----------------------------------------------------------------------------
-- 1. Cuantas filas devuelven las vistas SIN filtro (la fuga que se cierra)
-- -----------------------------------------------------------------------------
-- Se mide antes de borrarlas, para poder comparar despues con las funciones
-- aisladas: la suma por empresa tiene que dar menos o igual que esto.

DO $$
DECLARE
    v text;
    v_n bigint;
BEGIN
    FOREACH v IN ARRAY ARRAY[
        'libro_diario_integrado', 'libro_egresos',
        'libro_ingresos', 'resumen_ingresos_egresos'
    ] LOOP
        EXECUTE format('SELECT count(*) FROM public.%I', v) INTO v_n;
        RAISE NOTICE '027c: % sin filtro devuelve % filas (de todas las empresas)', v, v_n;
    END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- 2. Borrar las 4 vistas wrapper
-- -----------------------------------------------------------------------------
-- Primero las vistas, porque dependen de las funciones y Postgres no deja
-- dropear una funcion que una vista tiene en uso. Al reves falla.

DROP VIEW IF EXISTS public.libro_diario_integrado;
DROP VIEW IF EXISTS public.libro_egresos;
DROP VIEW IF EXISTS public.libro_ingresos;
DROP VIEW IF EXISTS public.resumen_ingresos_egresos;


-- -----------------------------------------------------------------------------
-- 3. Borrar las 8 funciones
-- -----------------------------------------------------------------------------
-- Se pasan los tipos EXACTOS de cada firma actual. Un tipo equivocado aqui no
-- da error de "no existe": no dropea nada y deja la funcion vieja filtrando.

DROP FUNCTION IF EXISTS public.get_libro_diario_integrado(text, date, date, text);
DROP FUNCTION IF EXISTS public.get_libro_mayor_integrado(text, date, date, text);
DROP FUNCTION IF EXISTS public.get_balance_comprobacion_integrado(text, date, date);
DROP FUNCTION IF EXISTS public.get_resumen_ingresos_egresos(text, date, date);
DROP FUNCTION IF EXISTS public.get_egresos_with_entries(text, date, date);
DROP FUNCTION IF EXISTS public.get_ingresos_with_entries(text, date, date);
DROP FUNCTION IF EXISTS public.get_accounts_with_opening_balances(text);
DROP FUNCTION IF EXISTS public.update_opening_balances(text, jsonb);

DO $$
DECLARE
    v     text;
    v_n   integer;
    v_sobra text;
BEGIN
    FOREACH v IN ARRAY ARRAY[
        'get_libro_diario_integrado', 'get_libro_mayor_integrado',
        'get_balance_comprobacion_integrado', 'get_resumen_ingresos_egresos',
        'get_egresos_with_entries', 'get_ingresos_with_entries',
        'get_accounts_with_opening_balances', 'update_opening_balances'
    ] LOOP
        SELECT count(*) INTO v_n
          FROM pg_proc p
          JOIN pg_namespace ns ON ns.oid = p.pronamespace
         WHERE ns.nspname = 'public' AND p.proname = v;

        IF v_n > 0 THEN
            SELECT string_agg(p.oid::regprocedure::text, ', ') INTO v_sobra
              FROM pg_proc p
              JOIN pg_namespace ns ON ns.oid = p.pronamespace
             WHERE ns.nspname = 'public' AND p.proname = v;
            RAISE EXCEPTION '027c: sobreviven overloads de %: %', v, v_sobra;
        END IF;
    END LOOP;
    RAISE NOTICE '027c: 8 funciones borradas, sin overloads colgando';
END $$;


-- -----------------------------------------------------------------------------
-- 4. Recrear las 8, con `p_company_id` OBLIGATORIO y sin DEFAULT
-- -----------------------------------------------------------------------------
-- `p_company_id` va primero y SIN DEFAULT a proposito: sin el, la funcion no
-- se puede ni invocar. Es lo unico que no se puede olvidar en silencio.
--
-- Se conserva `p_tenant_id` como filtro opcional que solo estrecha. Si alguien
-- pasa un tenant que no corresponde a la empresa, el resultado es 0 filas, no
-- datos de otra: las dos condiciones van en AND, nunca en OR.
--
-- Los filtros de `JournalEntry` y de `Transaction` van en el ON de los LEFT
-- JOIN, no en el WHERE. En el WHERE convertirian el LEFT en INNER y las cuentas
-- sin movimientos desaparecerian del reporte.
--
-- Se quita SECURITY DEFINER: no lo necesita para leer y con RLS desactivado
-- (supabase/disable-rls-*.sql) solo añade superficie.
-- -----------------------------------------------------------------------------

-- 4a) Libro diario -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_libro_diario_integrado(
    p_company_id   text,
    p_tenant_id    text DEFAULT NULL,
    p_start_date   date DEFAULT NULL,
    p_end_date     date DEFAULT NULL,
    p_tipo_filtro  text DEFAULT NULL
)
RETURNS TABLE(
    fecha timestamp without time zone,
    tipo_comprobante text,
    numero_comprobante integer,
    descripcion text,
    codigo_cuenta text,
    nombre_cuenta text,
    debe numeric,
    haber numeric,
    moneda text,
    tipo_cambio numeric,
    descripcion_asiento text,
    company_id text
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.date as fecha,
    t."voucherType" as tipo_comprobante,
    t."voucherNumber" as numero_comprobante,
    t.description as descripcion,
    a.code as codigo_cuenta,
    a.name as nombre_cuenta,
    CASE WHEN je.amount > 0 THEN je.amount / 100.0 ELSE 0 END as debe,
    CASE WHEN je.amount < 0 THEN ABS(je.amount) / 100.0 ELSE 0 END as haber,
    t.currency as moneda,
    t."exchangeRate" as tipo_cambio,
    je.description as descripcion_asiento,
    t.company_id as company_id
  FROM "Transaction" t
  JOIN "JournalEntry" je
    ON t.id = je."transactionId"
   AND je.company_id = p_company_id
  JOIN "Account" a
    ON je."accountId" = a.id
   AND a.company_id = p_company_id
  WHERE
    t.company_id = p_company_id
    AND (p_tenant_id IS NULL OR t."tenantId" = p_tenant_id)
    AND (p_start_date IS NULL OR t.date >= p_start_date)
    AND (p_end_date IS NULL OR t.date <= p_end_date)
    AND (p_tipo_filtro IS NULL OR t."voucherType" = p_tipo_filtro)
  ORDER BY t.date, t."voucherNumber", a.code;
END;
$function$;

COMMENT ON FUNCTION public.get_libro_diario_integrado(text, text, date, date, text) IS
  '027c: p_company_id obligatorio y sin DEFAULT. Sin el, la funcion no se puede llamar.';


-- 4b) Libro mayor --------------------------------------------------------------
-- El original traia los filtros de tenant y fecha en el WHERE, sobre un LEFT
-- JOIN: convertia el LEFT en INNER y las cuentas sin movimientos vanish. El
-- parche `OR t."tenantId" IS NULL` no lo arreglaba, solo dejaba pasar asientos de
-- cuentas cuya transaccion es de otra empresa.

CREATE OR REPLACE FUNCTION public.get_libro_mayor_integrado(
    p_company_id   text,
    p_tenant_id    text DEFAULT NULL,
    p_start_date   date DEFAULT NULL,
    p_end_date     date DEFAULT NULL,
    p_tipo_cuenta  text DEFAULT NULL
)
RETURNS TABLE(
    account_code text,
    account_name text,
    account_type text,
    total_transacciones integer,
    total_asientos integer,
    debit numeric,
    credit numeric,
    balance numeric,
    company_id text
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    a.code as account_code,
    a.name as account_name,
    a.type as account_type,
    COUNT(DISTINCT t.id)::integer as total_transacciones,
    COUNT(je.id)::integer as total_asientos,
    SUM(CASE WHEN je.amount > 0 THEN je.amount ELSE 0 END) / 100.0 as debit,
    SUM(CASE WHEN je.amount < 0 THEN ABS(je.amount) ELSE 0 END) / 100.0 as credit,
    (SUM(CASE WHEN je.amount > 0 THEN je.amount ELSE 0 END) +
     SUM(CASE WHEN je.amount < 0 THEN je.amount ELSE 0 END)) / 100.0 as balance,
    a.company_id as company_id
  FROM "Account" a
  LEFT JOIN "JournalEntry" je
    ON a.id = je."accountId"
   AND je.company_id = p_company_id
  LEFT JOIN "Transaction" t
    ON je."transactionId" = t.id
   AND t.company_id = p_company_id
   AND (p_start_date IS NULL OR t.date >= p_start_date)
   AND (p_end_date   IS NULL OR t.date <= p_end_date)
  WHERE
    a.company_id = p_company_id
    AND (p_tenant_id IS NULL OR a."tenantId" = p_tenant_id)
    AND (p_tipo_cuenta IS NULL OR a.type = p_tipo_cuenta)
  GROUP BY a.id, a.code, a.name, a.type, a.company_id
  ORDER BY a.code;
END;
$function$;


-- 4c) Balance de comprobacion --------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_balance_comprobacion_integrado(
    p_company_id   text,
    p_tenant_id    text DEFAULT NULL,
    p_start_date   date DEFAULT NULL,
    p_end_date     date DEFAULT NULL
)
RETURNS TABLE(
    account_code text,
    account_name text,
    account_type text,
    debit numeric,
    credit numeric,
    balance numeric,
    company_id text
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    a.code as account_code,
    a.name as account_name,
    a.type as account_type,
    SUM(CASE WHEN je.amount > 0 THEN je.amount ELSE 0 END) / 100.0 as debit,
    SUM(CASE WHEN je.amount < 0 THEN ABS(je.amount) ELSE 0 END) / 100.0 as credit,
    (SUM(CASE WHEN je.amount > 0 THEN je.amount ELSE 0 END) +
     SUM(CASE WHEN je.amount < 0 THEN je.amount ELSE 0 END)) / 100.0 as balance,
    a.company_id as company_id
  FROM "Account" a
  LEFT JOIN "JournalEntry" je
    ON a.id = je."accountId"
   AND je.company_id = p_company_id
  LEFT JOIN "Transaction" t
    ON je."transactionId" = t.id
   AND t.company_id = p_company_id
   AND (p_start_date IS NULL OR t.date >= p_start_date)
   AND (p_end_date   IS NULL OR t.date <= p_end_date)
  WHERE
    a.company_id = p_company_id
    AND (p_tenant_id IS NULL OR a."tenantId" = p_tenant_id)
  GROUP BY a.id, a.code, a.name, a.type, a.company_id
  ORDER BY a.code;
END;
$function$;


-- 4d) Resumen ingresos/egresos -------------------------------------------------
-- Nota: divide `totalAmount` entre 100 aunque `Transaction.totalAmount` esta en
-- lempiras y los asientos en unidades mezcladas. No se toca. Ver cabecera.

CREATE OR REPLACE FUNCTION public.get_resumen_ingresos_egresos(
    p_company_id   text,
    p_tenant_id    text DEFAULT NULL,
    p_start_date   date DEFAULT NULL,
    p_end_date     date DEFAULT NULL
)
RETURNS TABLE(
    "año" integer,
    mes integer,
    tipo text,
    total_transacciones integer,
    total_monto numeric,
    total_debe numeric,
    total_haber numeric,
    company_id text
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
      EXTRACT(YEAR FROM t.date)::integer as "año",
      EXTRACT(MONTH FROM t.date)::integer as mes,
      t."voucherType" as tipo,
      COUNT(DISTINCT t.id)::integer as total_transacciones,
      SUM(t."totalAmount") / 100.0 as total_monto,
      SUM(CASE WHEN je.amount > 0 THEN je.amount ELSE 0 END) / 100.0 as total_debe,
      SUM(CASE WHEN je.amount < 0 THEN ABS(je.amount) ELSE 0 END) / 100.0 as total_haber,
      t.company_id as company_id
  FROM "Transaction" t
  JOIN "JournalEntry" je
    ON t.id = je."transactionId"
   AND je.company_id = p_company_id
  WHERE
      t.company_id = p_company_id
      AND (p_tenant_id IS NULL OR t."tenantId" = p_tenant_id)
      AND (p_start_date IS NULL OR t.date >= p_start_date)
      AND (p_end_date IS NULL OR t.date <= p_end_date)
      AND t."voucherType" IN ('INGRESO', 'EGRESO')
  GROUP BY EXTRACT(YEAR FROM t.date), EXTRACT(MONTH FROM t.date), t."voucherType", t.company_id
  ORDER BY "año", mes, tipo;
END;
$function$;


-- 4e) Egresos con asientos -----------------------------------------------------
-- El `FILTER (WHERE je.id IS NOT NULL)` del jsonb_agg sigue siendo correcto con
-- el filtro de empresa en el ON: los asientos de otra empresa vienen con je.id
-- NULL y se descartan igual.

CREATE OR REPLACE FUNCTION public.get_egresos_with_entries(
    p_company_id   text,
    p_tenant_id    text DEFAULT NULL,
    p_start_date   date DEFAULT NULL,
    p_end_date     date DEFAULT NULL
)
RETURNS TABLE(
    id text,
    date timestamp without time zone,
    description text,
    voucher_number integer,
    currency text,
    total_amount bigint,
    entries jsonb,
    company_id text
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.date,
    t.description,
    t."voucherNumber",
    t.currency,
    t."totalAmount",
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', je.id,
          'account_id', je."accountId",
          'amount', je.amount,
          'description', je.description,
          'account', jsonb_build_object(
            'id', a.id,
            'code', a.code,
            'name', a.name,
            'type', a.type
          )
        )
      ) FILTER (WHERE je.id IS NOT NULL),
      '[]'::jsonb
    ) as entries,
    t.company_id as company_id
  FROM "Transaction" t
  LEFT JOIN "JournalEntry" je
    ON je."transactionId" = t.id
   AND je.company_id = p_company_id
  LEFT JOIN "Account" a
    ON a.id = je."accountId"
   AND a.company_id = p_company_id
  WHERE
    t.company_id = p_company_id
    AND t."voucherType" = 'EGRESO'
    AND (p_tenant_id IS NULL OR t."tenantId" = p_tenant_id)
    AND (p_start_date IS NULL OR t.date >= p_start_date)
    AND (p_end_date IS NULL OR t.date <= p_end_date)
  GROUP BY t.id, t.date, t.description, t."voucherNumber", t.currency, t."totalAmount", t.company_id
  ORDER BY t.date DESC, t."voucherNumber" DESC;
END;
$function$;


-- 4f) Ingresos con asientos ----------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_ingresos_with_entries(
    p_company_id   text,
    p_tenant_id    text DEFAULT NULL,
    p_start_date   date DEFAULT NULL,
    p_end_date     date DEFAULT NULL
)
RETURNS TABLE(
    id text,
    date timestamp without time zone,
    description text,
    voucher_number integer,
    currency text,
    total_amount bigint,
    entries jsonb,
    company_id text
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.date,
    t.description,
    t."voucherNumber",
    t.currency,
    t."totalAmount",
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', je.id,
          'account_id', je."accountId",
          'amount', je.amount,
          'description', je.description,
          'account', jsonb_build_object(
            'id', a.id,
            'code', a.code,
            'name', a.name,
            'type', a.type
          )
        )
      ) FILTER (WHERE je.id IS NOT NULL),
      '[]'::jsonb
    ) as entries,
    t.company_id as company_id
  FROM "Transaction" t
  LEFT JOIN "JournalEntry" je
    ON je."transactionId" = t.id
   AND je.company_id = p_company_id
  LEFT JOIN "Account" a
    ON a.id = je."accountId"
   AND a.company_id = p_company_id
  WHERE
    t.company_id = p_company_id
    AND t."voucherType" = 'INGRESO'
    AND (p_tenant_id IS NULL OR t."tenantId" = p_tenant_id)
    AND (p_start_date IS NULL OR t.date >= p_start_date)
    AND (p_end_date IS NULL OR t.date <= p_end_date)
  GROUP BY t.id, t.date, t.description, t."voucherNumber", t.currency, t."totalAmount", t.company_id
  ORDER BY t.date DESC, t."voucherNumber" DESC;
END;
$function$;


-- 4g) Cuentas con saldo inicial -----------------------------------------------
-- OJO: esta funcion y `update_opening_balances` works sobre `chart_of_accounts`
-- (89 filas, tenants 1 y cVcLafoZ), NO sobre `"Account"` (43 filas, tenants 1 y
-- ANGELOH7). Son dos planes de cuentas distintos. La que usa la app es `"Account"`.

-- `RETURNS SETOF chart_of_accounts` y NO una lista de columnas. Es a proposito:
-- este es el segundo intento (el primero declaraba `id text` y revienta con
-- "Returned type uuid does not match expected type text in column 1").
--
-- `supabase/FULL_SETUP.sql` declara `chart_of_accounts.id TEXT`, pero en la base
-- viva es `uuid`: **los SQL del repo NO son fuente de verdad para los tipos.**
-- Declarar los 12 tipos a mano es adivinar, y plpgsql no avisa hasta la primera
-- llamada. Con `SETOF` la forma de la fila es la de la tabla, siempre: no puede
-- desincronizarse.
--
-- Cambio de contrato: ahora devuelve la fila completa en vez de 12 columnas.
-- Es seguro porque **nada depende de esta funcion**: el `DROP` de arriba fue
-- bien (si algo la usara, habria fallado por dependencia) y no hay consumidor en
-- `app/` (medido). Ademas el `REVOKE` la deja en solo `service_role`.

CREATE OR REPLACE FUNCTION public.get_accounts_with_opening_balances(
    p_company_id   text,
    p_tenant_id    text DEFAULT NULL
)
RETURNS SETOF chart_of_accounts
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT coa.*
    FROM chart_of_accounts coa
   WHERE coa.company_id = p_company_id
     AND coa.is_active
     AND (p_tenant_id IS NULL OR coa.tenant_id = p_tenant_id)
   ORDER BY coa.code;
END;
$function$;


-- 4h) Escritura de saldos iniciales --------------------------------------------
-- Esta es la que importa por seguridad: es un UPDATE. Antes escribia en el tenant
-- que le mandara el cliente, sin empresa, y con `EXECUTE` para PUBLIC la podia
-- llamar la anon key. Ahora exige empresa y solo service_role la puede ejecutar.

CREATE OR REPLACE FUNCTION public.update_opening_balances(
    p_company_id   text,
    p_tenant_id    text,
    p_balances     jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    v_n integer;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id::text = p_company_id) THEN
        RAISE EXCEPTION 'update_opening_balances: la empresa % no existe', p_company_id;
    END IF;

    -- OJO, `updated_at` NO se toca. No se pudo verificar si `chart_of_accounts` tiene
-- esa columna (plpgsql no valida el cuerpo hasta la primera llamada, asi que un
-- `updated_at` inexistente no falla aqui: revienta en produccion, en el primer
-- guardado de saldos). Si el cuerpo original si la actualizaba, hay que volver a
-- anadirla. La 027c solo cambia el aislamiento.

    UPDATE chart_of_accounts coa
    SET opening_balance = (item->>'opening_balance')::BIGINT,
        opening_balance_date = (item->>'opening_balance_date')::DATE
    FROM jsonb_array_elements(p_balances) AS item
    WHERE coa.id::text = item->>'account_id'
      AND coa.tenant_id = p_tenant_id
      AND coa.company_id = p_company_id;

    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE 'update_opening_balances: % cuentas actualizadas en %', v_n, p_company_id;
END;
$function$;


-- -----------------------------------------------------------------------------
-- 5. Permisos: quitar PUBLIC y dejar solo service_role
-- -----------------------------------------------------------------------------
-- Exigir `p_company_id` impide el "dame todo", pero NO impide
-- `rpc/get_libro_diario_integrado?p_company_id=<la que sea>`: sin validar la
-- sesion, la funcion no sabe si el llamador tiene esa empresa. La unica que si
-- lo sabe es la ruta, que usa service role. Por eso se cierra el acceso directo.

DO $$
DECLARE
    v_firma text;
BEGIN
    FOREACH v_firma IN ARRAY ARRAY[
        'get_libro_diario_integrado(text, text, date, date, text)',
        'get_libro_mayor_integrado(text, text, date, date, text)',
        'get_balance_comprobacion_integrado(text, text, date, date)',
        'get_resumen_ingresos_egresos(text, text, date, date)',
        'get_egresos_with_entries(text, text, date, date)',
        'get_ingresos_with_entries(text, text, date, date)',
        'get_accounts_with_opening_balances(text, text)',
        'update_opening_balances(text, text, jsonb)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', v_firma);
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
            EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', v_firma);
        ELSE
            RAISE NOTICE '027c: el rol service_role no existe; no se conceden permisos en %', v_firma;
        END IF;
    END LOOP;
    RAISE NOTICE '027c: permisos ajustados (PUBLIC sin EXECUTE, service_role si)';
END $$;


-- -----------------------------------------------------------------------------
-- 6. Verificacion
-- -----------------------------------------------------------------------------

-- 6a) Por empresa, ninguna funcion puede devolver una fila de otra.

DO $$
DECLARE
    v_emp    text;
    v_malas  integer;
    v_total  integer;
BEGIN
    FOR v_emp IN SELECT id::text FROM companies ORDER BY id LOOP

        -- libro diario
        SELECT count(*) INTO v_total  FROM get_libro_diario_integrado(p_company_id => v_emp);
        SELECT count(*) INTO v_malas  FROM get_libro_diario_integrado(p_company_id => v_emp)
         WHERE company_id IS DISTINCT FROM v_emp;
        IF v_malas > 0 THEN
            RAISE EXCEPTION 'get_libro_diario_integrado devolvio % filas de otra empresa para %', v_malas, v_emp;
        END IF;

        -- libro mayor
        SELECT count(*) INTO v_malas  FROM get_libro_mayor_integrado(p_company_id => v_emp)
         WHERE company_id IS DISTINCT FROM v_emp;
        IF v_malas > 0 THEN
            RAISE EXCEPTION 'get_libro_mayor_integrado devolvio % filas de otra empresa para %', v_malas, v_emp;
        END IF;

        -- balance
        SELECT count(*) INTO v_malas  FROM get_balance_comprobacion_integrado(p_company_id => v_emp)
         WHERE company_id IS DISTINCT FROM v_emp;
        IF v_malas > 0 THEN
            RAISE EXCEPTION 'get_balance_comprobacion_integrado devolvio % filas de otra empresa para %', v_malas, v_emp;
        END IF;

        -- resumen
        SELECT count(*) INTO v_malas  FROM get_resumen_ingresos_egresos(p_company_id => v_emp)
         WHERE company_id IS DISTINCT FROM v_emp;
        IF v_malas > 0 THEN
            RAISE EXCEPTION 'get_resumen_ingresos_egresos devolvio % filas de otra empresa para %', v_malas, v_emp;
        END IF;

        -- egresos
        SELECT count(*) INTO v_malas  FROM get_egresos_with_entries(p_company_id => v_emp)
         WHERE company_id IS DISTINCT FROM v_emp;
        IF v_malas > 0 THEN
            RAISE EXCEPTION 'get_egresos_with_entries devolvio % filas de otra empresa para %', v_malas, v_emp;
        END IF;

        -- ingresos
        SELECT count(*) INTO v_malas  FROM get_ingresos_with_entries(p_company_id => v_emp)
         WHERE company_id IS DISTINCT FROM v_emp;
        IF v_malas > 0 THEN
            RAISE EXCEPTION 'get_ingresos_with_entries devolvio % filas de otra empresa para %', v_malas, v_emp;
        END IF;

        -- cuentas
        SELECT count(*) INTO v_malas  FROM get_accounts_with_opening_balances(p_company_id => v_emp)
         WHERE company_id IS DISTINCT FROM v_emp;
        IF v_malas > 0 THEN
            RAISE EXCEPTION 'get_accounts_with_opening_balances devolvio % filas de otra empresa para %', v_malas, v_emp;
        END IF;

        RAISE NOTICE '  % -> diario % filas, resto de funciones: 0 fugas', v_emp, v_total;
    END LOOP;

    RAISE NOTICE '027c OK: las 7 funciones de lectura devuelven 0 filas de otras empresas, en las 8 empresas';
END $$;


-- 6b) Sin p_company_id tienen que FALLAR, no devolver todo.

DO $$
DECLARE
    v_prueba text;
    v_msg    text;
BEGIN
    FOREACH v_prueba IN ARRAY ARRAY[
        'get_libro_diario_integrado', 'get_libro_mayor_integrado',
        'get_balance_comprobacion_integrado', 'get_resumen_ingresos_egresos',
        'get_egresos_with_entries', 'get_ingresos_with_entries',
        'get_accounts_with_opening_balances'
    ] LOOP
        -- Se captura el error fuera del handler a proposito. Con `WHEN OTHERS` que
        -- reporta "falla en cerrado" sin mirar el mensaje, una funcion rota de
        -- verdad (un `RETURNS TABLE` mal escrito, una columna que no existe)
        -- pasaria por buena: el error lo seriamos nosotros.
        v_msg := NULL;
        BEGIN
            EXECUTE format('SELECT count(*) FROM public.%I()', v_prueba);
            RAISE EXCEPTION 'FALLO-INTERNO: %() sin argumentos devolvio filas', v_prueba;
        EXCEPTION WHEN OTHERS THEN
            v_msg := SQLERRM;
        END;

        IF v_msg LIKE 'FALLO-INTERNO:%' THEN
            RAISE EXCEPTION '027c: %() sin argumentos devolvio filas; deberia fallar', v_prueba;
        ELSIF v_msg NOT LIKE '%does not exist%' THEN
            -- Sin `p_company_id` no debe existir overload. El error legitimo es
            -- "function ... does not exist". Cualquier otra cosa es un defecto.
            RAISE EXCEPTION '027c: %() fallo por otra causa: %', v_prueba, v_msg;
        END IF;

        RAISE NOTICE '027c OK: %() sin p_company_id falla en cerrado', v_prueba;
    END LOOP;
END $$;


-- 6c) Las 4 vistas ya no existen.

DO $$
DECLARE
    v text;
BEGIN
    FOREACH v IN ARRAY ARRAY[
        'libro_diario_integrado', 'libro_egresos',
        'libro_ingresos', 'resumen_ingresos_egresos'
    ] LOOP
        IF to_regclass(format('public.%I', v)) IS NOT NULL THEN
            RAISE EXCEPTION '027c: la vista public.% sigue existiendo', v;
        END IF;
    END LOOP;
    RAISE NOTICE '027c OK: las 4 vistas wrapper ya no existen';
END $$;


-- 6d) La funcion de ESCRITURA tambien necesita que le validen el cuerpo.
-- Los bloques 6a-6c nunca la llaman, y plpgsql no resuelve las columnas del
-- UPDATE hasta la primera llamada: un `opening_balance` mal escrito pasaria el
-- CREATE y reventaria en produccion, en el primer guardado de saldos.
-- Con `p_balances = '[]'` el `jsonb_array_elements` no devuelve filas, asi que el
-- UPDATE afecta 0 filas y no cambia nada, pero PostgreSQL lo PLANIFICA igual: si
-- una columna no existe, falla aqui y no en el guardado real.

DO $$
DECLARE
    v_emp text;
    v_ten text;
BEGIN
    FOR v_emp, v_ten IN
        SELECT id::text, tenant_id FROM companies ORDER BY id
    LOOP
        PERFORM public.update_opening_balances(v_emp, v_ten, '[]'::jsonb);
    END LOOP;

    RAISE NOTICE '027c OK: el cuerpo de update_opening_balances esta validado (0 filas escritas)';
END $$;


COMMIT;
