-- =============================================================================
-- 027f_vistas_tenant_id_desde_camelcase.sql
-- APLICAR A MANO en el SQL Editor de Supabase. Idempotente.
-- =============================================================================
--
-- EL AGUJERO QUE ESTA MIGRACION CIERRA
--
-- El aislamiento de reportes se apoya en DOS filtros a la vez:
--
--     .eq("tenant_id", empresa.tenantId)
--     .match(filtroEmpresaOCompany(empresa))   <-- companies.id
--
-- El segundo es el que aísla de verdad. El primero se pundio como "agrupa", y
-- agrupar no deberia poder dejarte ciego... pero puede, y aqui puede.
--
-- `Transaction` tiene TRES columnas de tenant, y no dicen lo mismo:
--
--     "tenantId"  (camel)   la buena. 32 ANGELOH7 - 14 "1" - 3 TEST1DS
--     tenant_id   (snake)   basura. La 027b2 la sincronizo, pero dejo en NULL
--                            las 3 transacciones de test 1 A PROPOSITO, para no
--                            violar `unique_voucher_tenant`.
--     tenantid    (snake)   muerta, 50 vacias
--
-- Y hay vistas que exponen la COLUMNA SNAKE como su `tenant_id`:
--
--     libro_diario             SELECT t.tenant_id          (L377 de la 027)
--     flujo_efectivo_mensual   SELECT/GROUP BY tenant_id  (L821, L845)
--     v_transacciones_cierre   SELECT t.tenant_id + WHERE t.tenant_id IS NOT NULL
--
-- Las tres leen la que esta en NULL para test 1. Consecuencia medida:
--
--     libro_diario filtrado por company_id  ->  6 filas de test 1
--     libro_diario + .eq(tenant_id,TEST1DS) ->  0 filas
--
-- O sea: **test 1 ve el libro diario VACIO teniendo 6 asientos propios.** Y
-- `v_transacciones_cierre` es peor, porque el `WHERE t.tenant_id IS NOT NULL`
-- las expulsa enteras: el cierre de periodos de test 1 no ve sus transacciones.
--
-- Esto NO es una fuga: es un CIERRE EN FALSO, el otro modo de romperse. El
-- `verificar-reportes.mjs` lo reportaba como "0 fugas" para test 1, y ese "0"
-- no era aislamiento, era el bug. Solo se distingue porque test 1 tiene datos
-- de verdad y test 2 no: es el unico caso end-to-end que hay en la base, y por
-- eso hacia falta mirarlo en vez de darlo por bueno.
--
-- EL ARREGLO
--
-- Que las vistas expongan el tenant de la columna camel, que es la que
-- coincide con `JournalEntry`. Se usa `COALESCE("tenantId", tenant_id)` y no
-- solo `"tenantId"` a proposito: si algun flujo antiguo escribiera solo la
-- snake, la vista no se quedaria ciego, que es justo lo que estamos arreglando.
--
-- OJO, y esto es lo que hace la migracion peligroso aplicarla a ciegas:
--
--   * `CREATE OR REPLACE VIEW` NO cambia el TIPO de una columna existente. Las
--     vistas affected no cambian de columnas ni de orden: se cambia EXPRESION.
--
--   * `v_transacciones_cierre` es una UNION de tres ramas. Hay que cambiar el
--     `tenant_id` y el `WHERE ... IS NOT NULL` en LAS TRES, o las ramas quedan
--     desalineadas y la vista falla con "each UNION query must have the same
--     number of columns" al no filtrar igual. Se veria enseguida, pero mejor
--     no depender de eso.
--
--   * NO se toca el `unique_voucher_tenant`: las 3 transacciones de test 1
--     seguiran con `tenant_id` en NULL a proposito. Esta migracion cambia de
--     donde SE LEE el tenant, no el dato almacenado. Rellenar la columna para
--     "arreglarlo" seria lo contrario de lo correcto: esas 3 comparten
--     (FACTURA, 1) y volverian a chocar con el indice unico.
--
-- VERIFICACION (despues de aplicarla)
--
--     node scripts/verificar-reportes.mjs
--
-- Lo que tiene que cambiar: `libro_diario` pasa de "test 1=0, SIN DATOS" a
-- test 1 con filas, y el aviso de "el aislamiento entre test 1 y test 2 no
-- queda demostrado" desaparece de esa vista. Las demas no cambian, porque sus
-- datos ya venian del camel.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Preflight: las 3 vistas tienen que existir y exponer `tenant_id`.
-- Sin esto, un nombre mal escrito crearia una vista NUEVA en minusculas y el
-- error saldria al final, lejos de la causa (ya paso con `InvoiceSummary`).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  vfalta text;
BEGIN
  SELECT string_agg(t, ', ' ORDER BY t) INTO vfalta
  FROM unnest(ARRAY[
    'libro_diario', 'flujo_efectivo_mensual', 'v_transacciones_cierre'
  ]) AS t
  WHERE to_regclass(format('public.%I', t)) IS NULL;

  IF vfalta IS NOT NULL THEN
    RAISE EXCEPTION 'ABORT: no existe(n) la(s) vista(s): %', vfalta;
  END IF;

  -- Las 3 deben exponer `tenant_id`, que es por donde entran los filtros.
  SELECT string_agg(v, ', ' ORDER BY v) INTO vfalta
  FROM (VALUES
    ('libro_diario'), ('flujo_efectivo_mensual'), ('v_transacciones_cierre')
  ) AS w(v)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_attribute at
    JOIN pg_class c ON c.oid = at.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = w.v
      AND at.attname = 'tenant_id'
      AND at.attnum > 0
      AND NOT at.attisdropped
  );

  IF vfalta IS NOT NULL THEN
    RAISE EXCEPTION 'ABORT: estas vistas no exponen tenant_id: %', vfalta;
  END IF;

  -- Se registra cuanto se va a recuperar, para poder compararlo despues.
  RAISE NOTICE 'libro_diario de test 1: % filas con tenant_id NULL (invisibles hoy)',
    (SELECT count(*) FROM libro_diario WHERE company_id IS NOT NULL AND tenant_id IS NULL);
  RAISE NOTICE 'flujo_efectivo_mensual con tenant_id NULL: %',
    (SELECT count(*) FROM flujo_efectivo_mensual WHERE company_id IS NOT NULL AND tenant_id IS NULL);
END $$;


-- -----------------------------------------------------------------------------
-- 1. libro_diario
-- El cambio es de una linea: `t.tenant_id` pasa a ser la camel.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW libro_diario AS
SELECT t.id AS transaction_id,
    t.date,
    t.description,
    t.voucher_type,
    t.voucher_number,
    t.reference,
    -- La buena es la camel. El COALESCE con la snake es para no volver a dejar
    -- ciego al que solo tenga la snake poblada.
    COALESCE(t."tenantId", t.tenant_id) AS tenant_id,
    je.id AS entry_id,
    je.amount,
    je.type AS entry_type,
    je.description AS entry_description,
    a.code AS account_code,
    a.name AS account_name,
    a.type AS account_type,
    t.company_id AS company_id,
    t.location_id AS location_id
   FROM "Transaction" t
     JOIN "JournalEntry" je
       ON (je.transaction_id = t.id OR je."transactionId" = t.id)
      AND je.company_id = t.company_id
     LEFT JOIN "Account" a
       ON (a.id = je.account_id OR a.id = je."accountId")
      AND a.company_id = t.company_id
  ORDER BY t.date DESC, t.voucher_type, t.voucher_number;


-- -----------------------------------------------------------------------------
-- 2. flujo_efectivo_mensual
-- OJO: el `tenant_id` aparece en el SELECT **y** en el GROUP BY. Si se cambia
-- solo uno, Postgres dice que la columna no aparece en el GROUP BY.
-- Ademas agrupar por la snake (NULL) juntaba a test 1 consigo mismo; ahora
-- agrupa por TEST1DS, que es lo correcto y ademas separa por `company_id`.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW flujo_efectivo_mensual AS
SELECT COALESCE(t."tenantId", t.tenant_id) AS tenant_id,
    date_trunc('month'::text, t.date) AS mes,
    sum(
        CASE
            WHEN t.type = 'INGRESO'::text OR t.vouchertype = 'INGRESO'::text OR t.voucher_type = 'INGRESO'::text THEN t.total_amount
            ELSE 0::bigint
        END) AS ingresos,
    sum(
        CASE
            WHEN t.type = 'EGRESO'::text OR t.vouchertype = 'EGRESO'::text OR t.voucher_type = 'EGRESO'::text THEN abs(t.total_amount)
            ELSE 0::bigint
        END) AS egresos,
    sum(
        CASE
            WHEN t.type = 'INGRESO'::text OR t.vouchertype = 'INGRESO'::text OR t.voucher_type = 'INGRESO'::text THEN t.total_amount
            ELSE 0::bigint
        END) - sum(
        CASE
            WHEN t.type = 'EGRESO'::text OR t.vouchertype = 'EGRESO'::text OR t.voucher_type = 'EGRESO'::text THEN abs(t.total_amount)
            ELSE 0::bigint
        END) AS flujo_neto,
    t.company_id,
    t.location_id
   FROM "Transaction" t
  GROUP BY COALESCE(t."tenantId", t.tenant_id), t.company_id, t.location_id, (date_trunc('month'::text, t.date))
  ORDER BY (date_trunc('month'::text, t.date)) DESC;


-- -----------------------------------------------------------------------------
-- 3. v_transacciones_cierre
-- UNION de 3 ramas: las 3 seleccionar el tenant correcto y las 3 exigir que
-- exista. La 1 y la 3 unian el asiento a la cuenta; la 2 son las transacciones
-- sin asientos (partidas dobles todavia sin cuadrar).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_transacciones_cierre AS
SELECT t.id AS id_transaccion,
    t.date AS fecha,
    t.description AS concepto,
    COALESCE(t.voucher_type, t.vouchertype) AS origen,
        CASE
            WHEN t.voucher_type = 'BORRADOR'::text OR t.vouchertype = 'BORRADOR'::text THEN 'BORRADOR'::text
            ELSE 'PUBLICADO'::text
        END AS estado,
    COALESCE(je.accountid, je.account_id) AS cuenta_id,
    COALESCE(a.code, ''::text) AS cuenta_codigo,
    COALESCE(a.name, ''::text) AS cuenta_nombre,
    COALESCE(je.amount, 0::bigint) AS monto,
        CASE
            WHEN COALESCE(je.amount, 0::bigint) > 0 THEN COALESCE(je.amount, 0::bigint)
            ELSE 0::bigint
        END AS debito,
        CASE
            WHEN COALESCE(je.amount, 0::bigint) < 0 THEN abs(COALESCE(je.amount, 0::bigint))
            ELSE 0::bigint
        END AS credito,
    COALESCE(t."tenantId", t.tenant_id) AS tenant_id,
    t.created_at,
    t.company_id AS company_id
   FROM "Transaction" t
     LEFT JOIN "JournalEntry" je
       ON je.transactionid = t.id
      AND je.company_id = t.company_id
     LEFT JOIN "Account" a
       ON a.id = je.accountid
      AND a.company_id = t.company_id
  -- OJO: el `WHERE` es la parte que hace el dano. Con `t.tenant_id IS NOT NULL`
  -- las 3 transacciones de test 1 NO ENTRABAN en la vista: el cierre de
  -- periodos no las veia. Ahora exige el tenant que SI esta poblado.
  WHERE COALESCE(t."tenantId", t.tenant_id) IS NOT NULL
UNION ALL
SELECT t.id AS id_transaccion,
    t.date AS fecha,
    t.description AS concepto,
    COALESCE(t.voucher_type, t.vouchertype) AS origen,
    'PENDIENTE'::text AS estado,
    NULL::text AS cuenta_id,
    ''::text AS cuenta_codigo,
    ''::text AS cuenta_nombre,
    t.total_amount AS monto,
        CASE
            WHEN t.total_amount > 0 THEN t.total_amount
            ELSE 0::bigint
        END AS debito,
        CASE
            WHEN t.total_amount < 0 THEN abs(t.total_amount)
            ELSE 0::bigint
        END AS credito,
    COALESCE(t."tenantId", t.tenant_id) AS tenant_id,
    t.created_at,
    t.company_id AS company_id
   FROM "Transaction" t
  WHERE COALESCE(t."tenantId", t.tenant_id) IS NOT NULL
    AND NOT (EXISTS ( SELECT 1
           FROM "JournalEntry"
          WHERE "JournalEntry".transactionid = t.id
            AND "JournalEntry".company_id = t.company_id))
UNION ALL
SELECT t.id AS id_transaccion,
    t.date AS fecha,
    t.description AS concepto,
    COALESCE(t.voucher_type, t.vouchertype) AS origen,
        CASE
            WHEN t.voucher_type = 'BORRADOR'::text OR t.vouchertype = 'BORRADOR'::text THEN 'BORRADOR'::text
            ELSE 'PUBLICADO'::text
        END AS estado,
    je.id AS cuenta_id,
    ''::text AS cuenta_codigo,
    ''::text AS cuenta_nombre,
    je.amount AS monto,
        CASE
            WHEN je.amount > 0 THEN je.amount
            ELSE 0::bigint
        END AS debito,
        CASE
            WHEN je.amount < 0 THEN abs(je.amount)
            ELSE 0::bigint
        END AS credito,
    COALESCE(t."tenantId", t.tenant_id) AS tenant_id,
    t.created_at,
    t.company_id AS company_id
   FROM "Transaction" t
     LEFT JOIN "JournalEntry" je
       ON je.transactionid = t.id
      AND je.company_id = t.company_id
     LEFT JOIN "Account" a
       ON a.id = je.accountid
      AND a.company_id = t.company_id
  WHERE COALESCE(t."tenantId", t.tenant_id) IS NOT NULL
    AND je.id IS NOT NULL AND a.id IS NULL;


COMMIT;
