-- 031: `v_transacciones_cierre` lee las columnas equivocadas de "JournalEntry".
--
-- CONTEXTO (medido sobre la base viva, no supuesto):
--
--   "JournalEntry" tiene TRES convenciones de columna y 027f elegirio las dos
--   equivocadas:
--       275: je.id AS cuenta_id
--       290: ON je.transactionid = t.id
--       295: ON a.id = je.accountid
--       264: WHERE "JournalEntry".transactionid = t.id   (rama 2, el NOT EXISTS)
--
--   Dato real de la tabla (101 asientos):
--       accountId        -> 101/101 poblada   <-- la que escribe y lee la app
--       account_id       ->  36/101 poblada
--       accountid        ->  36/101 poblada
--       transactionId    -> 101/101 poblada   <-- la que escribe y lee la app
--       transactionid    ->  36/101 poblada
--
--   Es decir: para 36 asientos las tres convenciones coinciden, y por eso la
--   vista "funcionaba" con esos. Para los otros 65 las columnas snake estan
--   NULL y el dato solo existe en camelCase.
--
-- CONSECUENCIA (esto es lo que rompia el cierre, no la 030):
--   - `je.transactionid = t.id` no casa para los 65 -> no aparecen como asientos.
--   - Ademas la rama 2 (NOT EXISTS con transactionid) cree que esas
--     transacciones NO tienen asientos -> las emite como 'PENDIENTE' con el
--     total de la transaccion. Por eso el cierre los contaba como pendientes y
--     ademas duplicaba el importe.
--   - Y donde si aparecian, `a.id = je.accountid` daba NULL -> cuenta_codigo ''
--     en las 98 filas de la vista.
--
--   Medido antes de esta migracion: la vista devolvia 98 filas y las 98 tinham
--   `cuenta_codigo` vacio, y 0 filas con cuenta 1101/4101 de empresa.
--
--   OJO: la 030 ya apunto los 65 asientos a las cuentas nuevas y eso esta bien
--   (`je."accountId"` y `je.company_id` correctos, 65/65). Lo que faltaba era
--   que la VISTA los leyera. Por eso 030 sola no arregla el cierre.
--
-- QUE HACE ESTA MIGRACION:
--   Reescribe las 3 ramas usando la columna camelCase primero y las snake como
--   respaldo, con el mismo COALESCE que ya usaba 027f pero en el orden real de
--   precedencia de datos:
--       COALESCE(je."transactionId", je.transactionid)
--       COALESCE(je."accountId", je.accountid, je.account_id)
--   Asi la vista sigue tolerando filas que solo tengan la convencion vieja, pero
--   ya no ignora las 65.
--
--   No se tocan `origen` ni `estado`: quedan igual que en 027f a proposito.
--   `origen` sale de `COALESCE(t.voucher_type, t.vouchertype)` y
--   `Transaction.voucher_type` esta sucio ('FACTURA' en las 50 filas), asi que
--   hoy siempre devuelven 'FACTURA'/'PUBLICADO'. Corregir eso es otro tema y
--   mezclarse aqui cambiaria el comportamiento del cierre sin evidencia de que
--   sea lo que se quiere.
--
-- IDEMPOTENTE: `CREATE OR REPLACE VIEW` sobre las mismas columnas y en el
-- mismo orden, asi que se puede correr dos veces.
-- -----------------------------------------------------------------------------

BEGIN;

-- 1) PREFLIGHT: tiene que existir la vista que vamos a reemplazar. Si no
--    existe, esta migracion no sirve y hay que revisar el orden.
DO $$
DECLARE
    v_existe int;
BEGIN
    SELECT count(*) INTO v_existe
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relname = 'v_transacciones_cierre'
       AND c.relkind = 'v'
       AND n.nspname = 'public';

    IF v_existe = 0 THEN
        RAISE EXCEPTION 'No existe la vista public.v_transacciones_cierre. Revisar el orden de migraciones (027/027f) antes de seguir.';
    END IF;
END $$;

-- 2) Que se va a arreglar y cuanto. Si `v_solo_camel` es 0 y `v_solo_snake`
--    tambien 0, las columnas ya coinciden y esta migracion es inocua (se
--    puede aplicar igual). Si `v_divergen` > 0 hay filas donde la vista y la
--    app apuntan a cosas distintas; eso es exactamente lo que se corrige.
DO $$
DECLARE
    v_solo_camel int;
    v_solo_snake int;
    v_divergen   int;
BEGIN
    SELECT
        count(*) FILTER (
            WHERE je."accountId" IS NOT NULL
              AND COALESCE(je.accountid, je.account_id) IS DISTINCT FROM je."accountId"
        ),
        count(*) FILTER (
            WHERE je."accountId" IS NULL
              AND COALESCE(je.accountid, je.account_id) IS NOT NULL
        ),
        count(*) FILTER (
            WHERE COALESCE(je."accountid", je.account_id) IS DISTINCT FROM je."accountId"
        )
      INTO v_solo_camel, v_solo_snake, v_divergen
      FROM "JournalEntry" je;

    RAISE NOTICE '031 preflight: % asientos con la cuenta en "accountId" y distinta en la snake (serian invisibles); % asientos solo con la snake; % en total divergentes.',
        v_solo_camel, v_solo_snake, v_divergen;
END $$;

CREATE OR REPLACE VIEW v_transacciones_cierre AS
-- RAMA 1: asientos que casan con su cuenta (partida doble real).
-- El cambio de esta migracion: el ON de "JournalEntry" pasa a
-- COALESCE("transactionId", transactionid) y el SELECT de cuenta a
-- COALESCE("accountId", accountid, account_id).
SELECT t.id AS id_transaccion,
    t.date AS fecha,
    t.description AS concepto,
    COALESCE(t.voucher_type, t.vouchertype) AS origen,
        CASE
            WHEN t.voucher_type = 'BORRADOR'::text OR t.vouchertype = 'BORRADOR'::text THEN 'BORRADOR'::text
            ELSE 'PUBLICADO'::text
        END AS estado,
    COALESCE(je."accountId", je.accountid, je.account_id) AS cuenta_id,
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
       ON COALESCE(je."transactionId", je.transactionid) = t.id
      AND je.company_id = t.company_id
     LEFT JOIN "Account" a
       ON a.id = COALESCE(je."accountId", je.accountid, je.account_id)
      AND a.company_id = t.company_id
  WHERE COALESCE(t."tenantId", t.tenant_id) IS NOT NULL
UNION ALL
-- RAMA 2: transacciones sin NINGUN asiento (todavia no cuadran). Este NOT
-- EXISTS tiene que usar la MISMA resolucion que el ON de la rama 1; si no,
-- los 65 asientos seguirian haciendose pasar sus transacciones por "sin
-- asientos" y se duplicaria el importe.
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
           FROM "JournalEntry" je
          WHERE COALESCE(je."transactionId", je.transactionid) = t.id
            AND je.company_id = t.company_id))
UNION ALL
-- RAMA 3: asientos cuya cuenta no se pudo resolver (cuenta borrada o de otra
-- empresa). Se listan en blanco a proposito: el cierre tiene que verlos para
-- poder bloquear el periodo en vez de cerrarlo con un descuadre invisible.
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
       ON COALESCE(je."transactionId", je.transactionid) = t.id
      AND je.company_id = t.company_id
     LEFT JOIN "Account" a
       ON a.id = COALESCE(je."accountId", je.accountid, je.account_id)
      AND a.company_id = t.company_id
  WHERE COALESCE(t."tenantId", t.tenant_id) IS NOT NULL
    AND je.id IS NOT NULL AND a.id IS NULL;

-- 3) VERIFICACION. Las 98 filas anteriores salian con `cuenta_codigo` vacio.
--    Despues, cada fila debe traer el codigo de su cuenta salvo las de la
--    rama 2 (PENDIENTE) y las de la rama 3 (cuenta sin resolver).
DO $$
DECLARE
    v_filas       int;
    v_pendientes  int;
    v_huerfanas   int;
    r             record;
BEGIN
    SELECT count(*),
           count(*) FILTER (WHERE estado = 'PENDIENTE'),
           count(*) FILTER (WHERE estado <> 'PENDIENTE' AND cuenta_codigo = '')
      INTO v_filas, v_pendientes, v_huerfanas
      FROM v_transacciones_cierre;

    RAISE NOTICE '031 post: % filas en la vista (% PENDIENTE, % asientos sin cuenta resuelta).',
        v_filas, v_pendientes, v_huerfanas;

    -- Aviso, NO error. Los asientos sin cuenta resuelta son la rama 3 y son un
    -- problema de DATOS, no de la vista: son asientos cuya cuenta pertenece a
    -- otra empresa (medido: 15 de Angelos apuntando a `acct-3101` y `acct-6103`,
    -- que son de Empresa 1). La vista ahora los enseña en blanco a proposito,
    -- que es justo lo que tiene que ver el cierre para bloquearse en vez de
    -- cerrarse con un descuadre. Si esto se hiciera EXCEPTION la 031 no se podria
    -- aplicar hasta arreglar las cuentas, y el cierre seguiria en negro.
    IF v_huerfanas > 0 THEN
        RAISE WARNING '031: quedan % asientos sin cuenta resoluble (cuenta de otra empresa o inexistente). La vista ya los lista en blanco. Se reparan en la 032.', v_huerfanas;

        FOR r IN
            SELECT je."accountId" AS cuenta,
                   count(*)     AS asientos,
                   count(DISTINCT je.company_id) AS empresas,
                   a.company_id AS empresa_de_la_cuenta
              FROM "JournalEntry" je
              LEFT JOIN "Account" a ON a.id = je."accountId"
             WHERE a.id IS NULL OR a.company_id IS DISTINCT FROM je.company_id
             GROUP BY je."accountId", a.company_id
             ORDER BY count(*) DESC
        LOOP
            RAISE WARNING '  cuenta % -> % asientos de la empresa %, pero la cuenta es de la empresa %',
                r.cuenta, r.asientos, r.empresas, COALESCE(r.empresa_de_la_cuenta, '(sin empresa)');
        END LOOP;
    END IF;
END $$;

COMMIT;
