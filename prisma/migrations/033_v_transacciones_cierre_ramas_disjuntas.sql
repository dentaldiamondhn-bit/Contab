-- 033: la rama 1 de `v_transacciones_cierre` no excluia las transacciones SIN
-- asiento ni los asientos sin cuenta -> filas PUBLICADO en blanco y duplicadas.
--
-- CONTEXTO (contra la base viva, tras aplicar 031 y 032):
--   La vista devolvia 105 filas: 101 con cuenta y 4 en blanco. Las 4 en blanco
--   eran 2 transacciones de Empresa 1 (`a4639705`, `74c3ea30`) que salian DOS
--   veces: una PUBLICADO (en blanco) y otra PENDIENTE.
--
--   Causa: la rama 1 hace `LEFT JOIN "JournalEntry"` y remata con
--       WHERE COALESCE(t."tenantId", t.tenant_id) IS NOT NULL
--   sin exigir que exista asiento ni que la cuenta se haya resuelto. Entonces:
--
--     - una transaccion SIN asientos sale en la rama 1 (je NULL -> monto 0,
--       cuenta vacia, estado PUBLICADO) y ADEMAS en la rama 2 (PENDIENTE):
--       duplicada. Eso mide los 2 casos de arriba (105 = 101+2 de rama 1, +2 de
--       rama 2).
--     - un asiento cuya cuenta NO se resuelve sale en la rama 1 (en blanco) y
--       ADEMAS en la rama 3 (que existe justo para esos): duplicado otra vez.
--       Hoy no hay ninguno (la 032 los dejo en 0), pero volveria en cuanto
--       aparezca una cuenta borrada o de otra empresa.
--
--   El bug es de la 027f original, no de la 031: con las columnas snake la rama 1
--   casi siempre daba blanco y tapaba el problema.
--
-- QUE HACE ESTA MIGRACION:
--   Anade a la rama 1 los dos guards que le faltaban, con lo que las tres ramas
--   quedan disjuntas y sin solape:
--       rama 1 -> asiento con cuenta resuelta
--       rama 2 -> transaccion sin ningun asiento
--       rama 3 -> asiento sin cuenta resuelta
--       WHERE ... AND je.id IS NOT NULL AND a.id IS NOT NULL;
--
-- IDEMPOTENTE: `CREATE OR REPLACE VIEW`, mismas columnas y orden que la 031.
-- -----------------------------------------------------------------------------

BEGIN;

DO $$
DECLARE
    v_existe int;
BEGIN
    SELECT count(*) INTO v_existe
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relname = 'v_transacciones_cierre' AND c.relkind = 'v' AND n.nspname = 'public';
    IF v_existe = 0 THEN
        RAISE EXCEPTION 'No existe public.v_transacciones_cierre. Aplicar 027/027f/031 antes.';
    END IF;
END $$;

CREATE OR REPLACE VIEW v_transacciones_cierre AS
-- RAMA 1: asiento con transaccion y cuenta resuelta. Los dos guards nuevos
-- (`je.id IS NOT NULL` y `a.id IS NOT NULL`) son el objeto de la 033.
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
    AND je.id IS NOT NULL
    AND a.id IS NOT NULL
UNION ALL
-- RAMA 2: transacciones sin NINGUN asiento.
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
-- RAMA 3: asiento cuya cuenta no se pudo resolver.
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

-- VERIFICACION: ninguna transaccion puede salir dos veces mezclando estados, y
-- no debe quedar ninguna fila PUBLICADO en blanco.
DO $$
DECLARE
    v_filas       int;
    v_blancasPub  int;
    v_duplicadas  int;
BEGIN
    SELECT count(*),
           count(*) FILTER (WHERE estado <> 'PENDIENTE' AND cuenta_codigo = '')
      INTO v_filas, v_blancasPub
      FROM v_transacciones_cierre;

    SELECT count(*) INTO v_duplicadas
      FROM (
        SELECT id_transaccion
          FROM v_transacciones_cierre
         GROUP BY id_transaccion
        HAVING count(DISTINCT estado) > 1
      ) d;

    RAISE NOTICE '033 post: % filas en la vista, % PUBLICADO en blanco, % transacciones con estados mezclados.',
        v_filas, v_blancasPub, v_duplicadas;

    IF v_blancasPub > 0 THEN
        RAISE EXCEPTION 'Quedan % asientos PUBLICADO sin cuenta; la rama 1 no quedo disjunta.', v_blancasPub;
    END IF;
    IF v_duplicadas > 0 THEN
        RAISE EXCEPTION 'Hay % transacciones con mas de un estado en la vista.', v_duplicadas;
    END IF;
END $$;

COMMIT;
