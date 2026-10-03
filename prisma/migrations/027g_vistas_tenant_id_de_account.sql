-- =============================================================================
-- 027g_vistas_tenant_id_de_account.sql
-- APLICAR A MANO en el SQL Editor de Supabase. Idempotente.
-- =============================================================================
--
-- CAUSA DETECTADA POR EL CANARIO (verificar-reportes.mjs):
--
-- `balanza_comprobacion`, `estado_resultados`, `balance_general`, `libro_mayor`
-- seleccionaban `a.tenant_id` (snake). En la BD real, `Account` tiene el tenant
-- SOLO en `"tenantId"` (camel): 43/43 cuentas. Por eso esas vistas exponian
-- `tenant_id = NULL` y el filtro `.eq('tenant_id', ...)` de las rutas las
-- dejaba vacias, aunque tuvieran 15-20 filas propias de la empresa.
--
-- Este cierre en falso era mas grave que el anterior: afectaba a Angelos y
-- Empresa 1, que son los que tienen datos.
--
-- NOTA: no se toca ninguna otra columna de tenant, y se mantiene el GROUP BY
-- por `a.tenant_id` usando el COALESCE, para que el reemplazo sea transparente.
--
-- Verificacion: despues de aplicarla, volver a correr
-- `node scripts/verificar-reportes.mjs`. Los 4 FALLAS del canario deben
-- desaparecer.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  vfalta text;
BEGIN
  SELECT string_agg(t, ', ' ORDER BY t) INTO vfalta
  FROM unnest(ARRAY[
    'balance_general', 'balanza_comprobacion', 'libro_mayor', 'estado_resultados'
  ]) AS t
  WHERE to_regclass(format('public.%I', t)) IS NULL;
  IF vfalta IS NOT NULL THEN
    RAISE EXCEPTION 'ABORT: no existe(n): %', vfalta;
  END IF;
END $$;

-- 1. balance_general
CREATE OR REPLACE VIEW balance_general AS
SELECT a.id,
    a.code,
    a.name,
    a.type,
    COALESCE(a."tenantId", a.tenant_id) AS tenant_id,
    COALESCE(sum(
        CASE
            WHEN je.type = 'DEBIT'::text THEN je.amount
            WHEN je.type = 'CREDIT'::text THEN - je.amount
            ELSE 0::bigint
        END), 0::numeric) AS balance,
    a.company_id AS company_id
   FROM "Account" a
     LEFT JOIN "JournalEntry" je
       ON (je.account_id = a.id OR je."accountId" = a.id)
      AND je.company_id = a.company_id
  WHERE a.is_active = true
  GROUP BY a.id, a.code, a.name, a.type, COALESCE(a."tenantId", a.tenant_id), a.company_id;

-- 2. balanza_comprobacion
CREATE OR REPLACE VIEW balanza_comprobacion AS
SELECT a.id,
    a.code,
    a.name,
    a.type,
    COALESCE(a."tenantId", a.tenant_id) AS tenant_id,
    COALESCE(sum(
        CASE
            WHEN je.type = 'DEBIT'::text THEN je.amount
            ELSE 0::bigint
        END), 0::numeric) AS total_debitos,
    COALESCE(sum(
        CASE
            WHEN je.type = 'CREDIT'::text THEN je.amount
            ELSE 0::bigint
        END), 0::numeric) AS total_creditos,
    COALESCE(sum(
        CASE
            WHEN je.type = 'DEBIT'::text THEN je.amount
            WHEN je.type = 'CREDIT'::text THEN - je.amount
            ELSE 0::bigint
        END), 0::numeric) AS saldo,
    a.company_id AS company_id
   FROM "Account" a
     LEFT JOIN "JournalEntry" je
       ON (je.account_id = a.id OR je."accountId" = a.id)
      AND je.company_id = a.company_id
  WHERE a.is_active = true
  GROUP BY a.id, a.code, a.name, a.type, COALESCE(a."tenantId", a.tenant_id), a.company_id
  ORDER BY a.code;

-- 3. libro_mayor
CREATE OR REPLACE VIEW libro_mayor AS
SELECT a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.type AS account_type,
    COALESCE(a."tenantId", a.tenant_id) AS tenant_id,
    COALESCE(sum(
        CASE
            WHEN je.type = 'DEBIT'::text THEN je.amount
            ELSE 0::bigint
        END), 0::numeric) AS total_debitos,
    COALESCE(sum(
        CASE
            WHEN je.type = 'CREDIT'::text THEN je.amount
            ELSE 0::bigint
        END), 0::numeric) AS total_creditos,
    COALESCE(sum(
        CASE
            WHEN je.type = 'DEBIT'::text THEN je.amount
            WHEN je.type = 'CREDIT'::text THEN - je.amount
            ELSE 0::bigint
        END), 0::numeric) AS saldo,
    count(je.id) AS movimientos,
    a.company_id AS company_id
   FROM "Account" a
     LEFT JOIN "JournalEntry" je
       ON (je.account_id = a.id OR je."accountId" = a.id)
      AND je.company_id = a.company_id
  WHERE a.is_active = true
  GROUP BY a.id, a.code, a.name, a.type, COALESCE(a."tenantId", a.tenant_id), a.company_id
  ORDER BY a.code;

-- 4. estado_resultados
CREATE OR REPLACE VIEW estado_resultados AS
SELECT a.id,
    a.code,
    a.name,
    a.type,
    COALESCE(a."tenantId", a.tenant_id) AS tenant_id,
    COALESCE(sum(
        CASE
            WHEN je.type = 'DEBIT'::text THEN je.amount
            WHEN je.type = 'CREDIT'::text THEN - je.amount
            ELSE 0::bigint
        END), 0::numeric) AS balance,
    a.company_id AS company_id
   FROM "Account" a
     LEFT JOIN "JournalEntry" je
       ON (je.account_id = a.id OR je."accountId" = a.id)
      AND je.company_id = a.company_id
  WHERE a.is_active = true AND (a.type = ANY (ARRAY['REVENUE'::text, 'EXPENSE'::text]))
  GROUP BY a.id, a.code, a.name, a.type, COALESCE(a."tenantId", a.tenant_id), a.company_id;

COMMIT;
