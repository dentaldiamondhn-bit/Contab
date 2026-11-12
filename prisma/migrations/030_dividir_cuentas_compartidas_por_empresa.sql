-- =============================================================================
-- 030_dividir_cuentas_compartidas_por_empresa.sql
-- REPARACION DE AISLAMIENTO (NO ES BORRADO DE BASURA)
-- Version 2: incluye el arreglo del UNIQUE global que hacia fallar el v1
-- =============================================================================
-- INTENTO 1 (fallo): `23505 duplicate key ... "Account_name_key"` al insertar las
-- copias. La tabla tiene un **UNIQUE GLOBAL sobre `name`** (y muy posiblemente
-- tambien sobre `code`). Este es el hallazgo importante:
--
--   En multi-empresa, el nombre de una cuenta NO puede ser unico globalmente.
--   Todas las empresas tienen una "Caja y Bancos". Con ese UNIQUE es IMPOSIBLE
--   que dos empresas tengan el mismo plan de cuentas, y eso es justamente lo que
--   provoco este bug: la semilla no pudo crear una 1101 por empresa, asi que
--   creo UNA fila compartida y le coloco los asientos de tres empresas.
--
--   O sea: **el UNIQUE global no es un obstaculo administrativo, es la causa.**
--
-- HALLAZGO (medido en produccion, 30 Sept 2026):
--
--   Account 1101 "Caja y Bancos"            -> 42 JournalEntry
--   Account 4101 "Ingresos por Servicios"  -> 23 JournalEntry
--                                          =  65 asientos (64% del libro entero)
--
--   Las DOS filas son una sola, compartida, con `tenantId='tenant_001'` (que no
--   existe en `Tenant`), pero las usan TRES empresas a la vez:
--     1101: Angelos 27 | Empresa 1 12 | test 1  3
--     4101: Angelos 13 | Empresa 1  7 | test 1  3
--
--   Datos reales: importes HNL no nulos (0 ceros de 65), 42 `Transaction`
--   existentes, rango 2024-01-01 .. 2026-09-30, suma -167.560,00 HNL.
--
-- CONSECUENCIA: `v_transacciones_cierre` une por tenant, asi que estos 65 asientos
--   NO APARECEN en el libro de cierre. Los saldos de Angelos, Empresa 1 y test 1
--   salen mal en el cierre. Y la 028 no los arregla (solo rellena `tenant_id`
--   cuando el tenant camel existe en `Tenant`, y `tenant_001` no existe).
--
-- QUE HACE ESTA MIGRACION:
--   0b. Quita el UNIQUE global de `name`/`code` y pone el UNIQUE que corresponde
--       a multi-empresa: (company_id, name) y (company_id, code).
--   1.  Crea una copia de 1101 y 4101 por cada empresa que las usa, con su
--       tenant y company_id correctos.
--   2.  Reapunta cada JournalEntry a la copia de SU empresa.
--   3.  Deja las filas originales huerfanas y sin movimientos (NO se borran: es
--       DML destructivo y requiere tu OK explicito).
--
-- Las otras 6 cuentas sin `company_id` (1102, 1301, 1501, 5102, 5201, 2201) tienen
-- 0 asientos: son basura de semilla y se pueden borrar cuando quieras, pero aqui
--   no se tocan.
--
-- APLICAR EN SUPABASE SQL EDITOR. Backup antes. Es DDL+DML.
-- Aborta si los numeros medidos ya no coinciden. Idempotente.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. PREFLIGHT: si la base cambio, abortar en vez de tocar datos a ciegas.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_1101 integer;
  v_4101 integer;
  v_empresas integer;
  v_huerfanas integer;
  v_chocan integer;
  v_dup_codigo integer;
  v_dup_nombre integer;
BEGIN
  SELECT count(*) INTO v_1101
  FROM "JournalEntry" je JOIN "Account" a ON a.id = je."accountId"
  WHERE a.code = '1101' AND a."company_id" IS NULL;

  SELECT count(*) INTO v_4101
  FROM "JournalEntry" je JOIN "Account" a ON a.id = je."accountId"
  WHERE a.code = '4101' AND a."company_id" IS NULL;

  SELECT count(DISTINCT je."company_id") INTO v_empresas
  FROM "JournalEntry" je JOIN "Account" a ON a.id = je."accountId"
  WHERE a.code IN ('1101', '4101') AND a."company_id" IS NULL;

  SELECT count(*) INTO v_huerfanas FROM "Account" WHERE "company_id" IS NULL;

  -- Si alguna empresa ya tuviera una 1101/4101 propia, la copia chocaria.
  SELECT count(*) INTO v_chocan FROM "Account"
  WHERE "company_id" IS NOT NULL AND code IN ('1101', '4101');

  -- El UNIQUE por empresa solo se puede crear si no hay repetidos hoy.
  SELECT count(*) INTO v_dup_codigo FROM (
    SELECT 1 FROM "Account" WHERE "company_id" IS NOT NULL
    GROUP BY "company_id", code HAVING count(*) > 1) q;
  SELECT count(*) INTO v_dup_nombre FROM (
    SELECT 1 FROM "Account" WHERE "company_id" IS NOT NULL
    GROUP BY "company_id", name HAVING count(*) > 1) q;

  RAISE NOTICE 'preflight: 1101=%  4101=%  empresas=%  huerfanas=%  ya-existen-propias=%  dup(codigo)=%  dup(nombre)=%',
    v_1101, v_4101, v_empresas, v_huerfanas, v_chocan, v_dup_codigo, v_dup_nombre;

  IF v_1101 <> 42 OR v_4101 <> 23 OR v_empresas <> 3 OR v_huerfanas <> 8 THEN
    RAISE EXCEPTION 'Cambio la medicion (esperado 42/23/3/8, encontrado %/%/%/%). Revisar antes de aplicar.',
      v_1101, v_4101, v_empresas, v_huerfanas;
  END IF;
  IF v_chocan > 0 THEN
    RAISE EXCEPTION 'Alguna empresa ya tiene su propia 1101/4101 (%). La 030 no debe duplicarla.', v_chocan;
  END IF;
  IF v_dup_codigo > 0 OR v_dup_nombre > 0 THEN
    RAISE EXCEPTION 'Hay repetidos por empresa (codigo=%, nombre=%): no se puede crear el UNIQUE por empresa.', v_dup_codigo, v_dup_nombre;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 0b. EL UNIQUE GLOBAL -> UNIQUE POR EMPRESA.
--
-- POR QUE HAY QUE MIRAR `pg_index` Y NO SOLO `pg_constraint` (ya se fallo dos
-- veces por esto). El UNIQUE de Prisma se crea con `CREATE UNIQUE INDEX`, o sea
-- que es un **indice**, no un constraint de tabla: no aparece en `pg_constraint`
-- con `contype='u'`. Y Postgres reporta igual `violates unique constraint
-- "Account_name_key"` en los dos casos, porque el mensaje usa el nombre del
-- indice. Por eso buscar solo en `pg_constraint` no droppaba nada y el INSERT
-- volvia a fallar con el MISMO error.
--
-- Se recorren los indices unicos de "Account", se descartan la PK, y se droppan
-- los de UNA sola columna que sean `name` o `code`. Si uno de ellos pertenece a
-- un constraint, se baja el CONSTRAINT (bajar el indice daria error).
-- No se adivinan nombres: `Account_name_key` viene de una version antigua del
-- schema de Prisma y ya no esta en `prisma/schema.prisma` (ahi `name` no es
-- unico), asi que quitarlo elimina drift en vez de crearlo.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  col text;
  n_drop integer := 0;
BEGIN
  FOR r IN
    SELECT i.indexrelid, i.indisprimary, i.indnkeyatts, ic.relname AS idx_name,
           EXISTS (SELECT 1 FROM pg_constraint k
                   WHERE k.conindid = i.indexrelid AND k.contype = 'u') AS es_constraint
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
    WHERE nsp.nspname = 'public'
      AND tc.relname = 'Account'
      AND i.indisunique
  LOOP
    IF r.indisprimary THEN
      RAISE NOTICE 'se conserva (clave primaria): %', r.idx_name;
      CONTINUE;
    END IF;

    -- pg_get_indexdef(oid, 1, true) devuelve la columna si es una sola.
    col := NULL;
    IF r.indnkeyatts = 1 THEN
      col := pg_get_indexdef(r.indexrelid, 1, true);
    END IF;

    IF col IN ('name', 'code', '"name"', '"code"') THEN
      IF r.es_constraint THEN
        EXECUTE format('ALTER TABLE public."Account" DROP CONSTRAINT %I', r.idx_name);
      ELSE
        EXECUTE format('DROP INDEX IF EXISTS public.%I', r.idx_name);
      END IF;
      n_drop := n_drop + 1;
      RAISE NOTICE 'dropped unique global de una columna: %  (columna: %, era constraint: %)',
        r.idx_name, col, r.es_constraint;
    ELSE
      RAISE NOTICE 'se conserva: %  (columnas: %, constraint: %)', r.idx_name, coalesce(col, '>1 columna'), r.es_constraint;
    END IF;
  END LOOP;

  -- Si no hemos droppado NADA, algo no cuadra con lo medido. Antes esto pasaba
  -- en silencio y el error decia exactamente lo mismo, sin pistas.
  IF n_drop = 0 THEN
    RAISE EXCEPTION
      'No se encontro ningun indice unico de una sola columna sobre name/code en Account. Sin esto el INSERT no puede funcionar. Revisar pg_index a mano antes de seguir.';
  END IF;
END $$;

-- Comprobacion de salida: no debe quedar ningun indice unico de UNA columna
-- sobre name/code. Si queda, el INSERT volveria a fallar con 23505.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT ic.relname AS idx_name, pg_get_indexdef(i.indexrelid, 1, true) AS col
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
    WHERE nsp.nspname = 'public' AND tc.relname = 'Account'
      AND i.indisunique AND NOT i.indisprimary AND i.indnkeyatts = 1
  LOOP
    IF r.col IN ('name', 'code', '"name"', '"code"') THEN
      RAISE EXCEPTION ' sigue vivo el indice unico global % sobre %', r.idx_name, r.col;
    END IF;
  END LOOP;
  RAISE NOTICE 'verificado: no quedan indices unicos globales de name/code';
END $$;

-- El UNIQUE que corresponde a multi-empresa. `company_id` es NULL en las 8 legacy,
-- y Postgres trata los NULL como distintos, asi que esas no colisionan entre si.
CREATE UNIQUE INDEX IF NOT EXISTS "Account_company_id_code_key"
  ON public."Account" ("company_id", code);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_company_id_name_key"
  ON public."Account" ("company_id", name);

-- -----------------------------------------------------------------------------
-- 1. Copia por empresa de 1101 y 4101.
--    Solo si no existe ya la copia de esa empresa para ese codigo (idempotente).
--    `Account.id` es TEXT, no uuid: por eso el cast explico.
-- -----------------------------------------------------------------------------
INSERT INTO "Account" (
  id, name, code, "type", description, "parentId",
  "createdAt", "updatedAt",
  "tenantId", "tenant_id", "parent_id", "is_active", "updated_at", "created_at",
  "tenantid", "isactive", "company_id"
)
SELECT
  gen_random_uuid()::text,
  a.name,
  a.code,
  a."type",
  a.description,
  a."parentId",
  now(), now(),
  c.tenant_id,            -- tenant de la empresa que USA la cuenta
  c.tenant_id,
  a."parent_id",
  a."is_active",
  now(), now(),
  c.tenant_id,            -- columna legacy en minusculas
  a."isactive",
  c.id                    -- company_id: la empresa que la usa
FROM "Account" a
CROSS JOIN LATERAL (
  -- Para cada cuenta rota, una fila por cada empresa que la ha usado de verdad.
  SELECT je."company_id"
  FROM "JournalEntry" je
  WHERE je."accountId" = a.id AND je."company_id" IS NOT NULL
  GROUP BY je."company_id"
) u
JOIN public.companies c ON c.id = u."company_id"
WHERE a.code IN ('1101', '4101')
  AND a."company_id" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Account" ya
    WHERE ya.code = a.code AND ya."company_id" = c.id
  );

-- -----------------------------------------------------------------------------
-- 2. Reapuntar cada asiento a la copia de SU empresa.
--    El criterio es la propia `company_id` del asiento, que es confiable 101/101
--    segun la 027b. No hay ambiguedad posible: no es heuristica.
--    El join exige ademas que la copia tenga el tenant de ESA empresa, para que
--    ninguna fila quede con tenant y company_id discrepantes.
-- -----------------------------------------------------------------------------
WITH destino AS (
  SELECT je.id AS je_id, nueva.id AS account_id
  FROM "JournalEntry" je
  JOIN "Account" orig
    ON orig.id = je."accountId"
  JOIN public.companies c
    ON c.id = je."company_id"
  JOIN "Account" nueva
    ON nueva.code = orig.code
   AND nueva."company_id" = je."company_id"
   AND nueva."tenant_id" = c.tenant_id
  WHERE orig.code IN ('1101', '4101')
    AND orig."company_id" IS NULL
    AND je."company_id" IS NOT NULL
)
UPDATE "JournalEntry" je
SET "accountId" = d.account_id
FROM destino d
WHERE je.id = d.je_id;

-- -----------------------------------------------------------------------------
-- 3. Las filas originales quedan huerfanas y sin movimientos. NO se borran.
--    Verifica el 0 ANTES de borrarlas, y solo si me confirmas:
--      SELECT code, name FROM "Account" WHERE "company_id" IS NULL;
--      SELECT a.code, count(je.id) FROM "Account" a
--      LEFT JOIN "JournalEntry" je ON je."accountId" = a.id
--      WHERE a."company_id" IS NULL GROUP BY a.code;   -- todos a 0
-- -----------------------------------------------------------------------------

COMMIT;

-- =============================================================================
-- VERIFICACION (read-only)
-- =============================================================================
-- 1) Ningun asiento debe apuntar a una cuenta sin company_id (esperado 0):
--      SELECT count(*) FROM "JournalEntry" je
--      JOIN "Account" a ON a.id = je."accountId"
--      WHERE a."company_id" IS NULL;
--
-- 2) Las copias por empresa (esperado 3 x 1101 + 3 x 4101 = 6):
--      SELECT code, "company_id", "tenantId" FROM "Account"
--      WHERE code IN ('1101','4101') ORDER BY code, "company_id";
--
-- 3) Los 65 asientos movidos (esperado Angelos 27+13, Empresa 1 12+7, test 1 3+3):
--      SELECT c.name, a.code, count(*), sum(je.amount)
--      FROM "JournalEntry" je
--      JOIN "Account" a ON a.id = je."accountId"
--      JOIN public.companies c ON c.id = je."company_id"
--      WHERE a.code IN ('1101','4101') GROUP BY 1,2 ORDER BY 1,2;
--
-- 4) Ya deben verse en el cierre (esperado 98 + 65 = 163):
--      SELECT company_id, count(*) FROM public.v_transacciones_cierre GROUP BY 1;
--
-- 5) CONSECUENCIA A REVISAR: `lib/accounting/resolve-account.ts` busca por
--    prefijo de codigo con `.order('code')` y `.limit(1)`. Angelos ya tenia
--    "1101-01 Caja General" y "4101-01"; con la copia nueva "1101" esa cuenta
--    gana el prefijo y "1101-01" queda sin uso. Los 65 asientos historicos
--    quedan en "1101", asi que no se pierde nada, pero Angelos pasa a tener dos
--    cuentas de caja. Decide tu cual es la buena; esta migracion no lo cambia.
--
-- 6) `type` sigue NULL en esos 65 (el signo decide DEBIT/CREDIT). No lo cambia
--    esta migracion. Si quieres sellarlo, preparo una 031 que lo fije por signo.
-- =============================================================================
