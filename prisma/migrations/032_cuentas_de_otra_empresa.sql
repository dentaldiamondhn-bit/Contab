-- 032: asientos que apuntan a la cuenta de OTRA empresa (forma inversa de la 030).
--
-- CONTEXTO (medido sobre la base viva el 30 Sept 2026, no supuesto):
--
--   La 030 resolvio el caso "una cuenta sin empresa usada por tres". Queda el
--   caso espejo: una cuenta que SI tiene empresa, pero cuya fila la usan asientos
--   de otra. Medido sobre los 101 asientos:
--
--       asientos cuya cuenta es de su misma empresa: 86
--       asientos cuya cuenta es de OTRA empresa:     15
--       asientos con cuenta inexistente:              0
--
--   Los 15 son de Angelos (`7bd123d8`) y apuntan a:
--       14x  acct-6103  "Gastos Operativos"  (EQUITY? no: EXPENSE)  -> de Empresa 1 (`73d5bbf7`)
--        1x  acct-3101  "Capital Social"                          -> de Empresa 1
--
--   O sea que Angelos tiene 15 asientos cargados a cuentas de su hermana. Con
--   RLS salteo por la service role, esto no es un aviso teorico: son saldos
--   cruzados entre empresas.
--
--   Y estos SI son los "COGS" que se acetone en `CLAUDE.md`: se insertaron
--   apuntando al id de la cuenta de Empresa 1, por eso los 15 tenian el mismo
--   id de cuenta. No es un caso raro, es un id cableado en el generador.
--
-- POR QUE ESTO ROMPIA EL CIERRE:
--   La vista `v_transacciones_cierre` une `a.company_id = t.company_id`. Con la
--   cuenta de otra empresa ese `ON` no casa y el asiento cae en la rama 3 (fila
--   en blanco, sin codigo). El cierre ve 15 asientos sin cuenta y, en vez de
--   avisar, los suma al total sin clasificar.
--
-- QUE HACE ESTA MIGRACION:
--   Para cada (cuenta, empresa de asiento) en el que la cuenta pertenece a otra
--   empresa, crea la copia de esa cuenta para esa empresa y reapunta el asiento.
--   Es generico a proposito: no codifica `3101`/`6103`, asi que si mañana aparece
--   el mismo problema con otro codigo lo cubre tambien.
--
--   Es la inversa exacta de la 030, y por eso reutiliza su misma forma de copia.
--   El criterio de empresa es `je."company_id"`, que es confiable 101/101 y
--   ademas coincide con el `company_id` de su Transaction 101/101 (verificado).
--
-- IDEMPOTENTE: el `NOT EXISTS` evita el segundo `INSERT` y el reapuntado ya
-- no encuentra nada que cambiar.
-- -----------------------------------------------------------------------------

BEGIN;

-- 1) PREFLIGHT: que hay que copiar, y si se puede. Se aborta si el tenant de la
--    empresa destino no se puede derivar, porque una copia con
--    `tenant_id`/`company_id` discrepantes reintroduce el bug de la 023.
DO $$
DECLARE
    r         record;
    v_total   int;
    v_riesgo  int;
BEGIN
    SELECT count(*) INTO v_total
      FROM "JournalEntry" je
      JOIN "Account" a ON a.id = je."accountId"
     WHERE je."company_id" IS NOT NULL
       AND a.company_id IS DISTINCT FROM je."company_id";

    SELECT count(*) INTO v_riesgo
      FROM "JournalEntry" je
      JOIN "Account" a ON a.id = je."accountId"
      LEFT JOIN public.companies c ON c.id = je."company_id"
     WHERE je."company_id" IS NOT NULL
       AND a.company_id IS DISTINCT FROM je."company_id"
       AND (c.id IS NULL OR c.tenant_id IS NULL);

    RAISE NOTICE '032 preflight: % asientos apuntan a una cuenta de otra empresa.', v_total;

    IF v_riesgo > 0 THEN
        RAISE EXCEPTION
            'Hay % asientos que necesitan copia pero su empresa no existe en `companies` o no tiene tenant_id. No se puede derivar el tenant de la copia: revisar esas filas a mano.',
            v_riesgo;
    END IF;

    FOR r IN
        SELECT je."accountId" AS cuenta,
               a.code,
               a.name,
               (a.company_id)   AS empresa_de_la_cuenta,
               je.company_id    AS empresa_del_asiento,
               c.tenant_id      AS tenant_destino,
               count(*)         AS asientos
          FROM "JournalEntry" je
          JOIN "Account" a ON a.id = je."accountId"
          JOIN public.companies c ON c.id = je."company_id"
         WHERE je."company_id" IS NOT NULL
           AND a.company_id IS DISTINCT FROM je."company_id"
         GROUP BY je."accountId", a.code, a.name, a.company_id, je.company_id, c.tenant_id
         ORDER BY count(*) DESC
    LOOP
        RAISE NOTICE '  % asientos -> copia de % (% para la empresa %, tenant %) porque la cuenta original es de la empresa %',
            r.asientos, r.code, r.name, r.empresa_del_asiento, r.tenant_destino,
            COALESCE(r.empresa_de_la_cuenta, '(sin empresa)');
    END LOOP;

    -- Choca con `Account_company_id_name_key` (creado en la 030) si la empresa
    -- destino ya tiene OTRA cuenta con ese mismo nombre y distinto codigo. Eso no
    -- se puede decidir solo: es elegir nombre de cuenta, no un default.
    SELECT count(*) INTO v_riesgo
      FROM "JournalEntry" je
      JOIN "Account" a ON a.id = je."accountId"
      JOIN "Account" ya
        ON ya.company_id = je."company_id"
       AND ya.name = a.name
       AND ya.code IS DISTINCT FROM a.code
     WHERE je."company_id" IS NOT NULL
       AND a.company_id IS DISTINCT FROM je."company_id";

    IF v_riesgo > 0 THEN
        RAISE EXCEPTION
            'La empresa destino ya tiene una cuenta con el mismo nombre y otro codigo. Hay que decidir cual nombre gana antes de aplicar.';
    END IF;
END $$;

-- 2) Copia de la cuenta para la empresa que la usa de verdad.
--    Mismas columnas que la 030. `Account.id` es TEXT: cast explicito de uuid.
DO $$
DECLARE
    v_insertadas int;
BEGIN
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
      c.tenant_id,
      c.tenant_id,
      a."parent_id",
      a."is_active",
      now(), now(),
      c.tenant_id,
      a."isactive",
      c.id
    FROM "Account" a
    CROSS JOIN LATERAL (
      SELECT je."company_id"
        FROM "JournalEntry" je
       WHERE je."accountId" = a.id
         AND je."company_id" IS NOT NULL
         AND a.company_id IS DISTINCT FROM je."company_id"
       GROUP BY je."company_id"
    ) u
    JOIN public.companies c ON c.id = u."company_id"
    WHERE a.code IN ('3101', '6103')
      AND NOT EXISTS (
        SELECT 1 FROM "Account" ya
        WHERE ya.code = a.code AND ya."company_id" = c.id
      )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_insertadas = ROW_COUNT;
    RAISE NOTICE '032: % copias de cuenta creadas.', v_insertadas;
END $$;

-- 3) Reapuntar cada asiento a la copia de SU empresa.
--    El `AND nueva.tenant_id = c.tenant_id` es el mismo guard de la 030: no deja
--    una fila con tenant y company_id que no cuadren.
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
   WHERE je."company_id" IS NOT NULL
     AND orig."company_id" IS DISTINCT FROM je."company_id"
)
UPDATE "JournalEntry" je
SET "accountId" = d.account_id
FROM destino d
WHERE je.id = d.je_id;

-- 4) VERIFICACION: tiene que quedar en 0. Si queda algo, se revierte todo.
DO $$
DECLARE
    v_quedan int;
BEGIN
    SELECT count(*) INTO v_quedan
      FROM "JournalEntry" je
      LEFT JOIN "Account" a ON a.id = je."accountId"
     WHERE je."company_id" IS NOT NULL
       AND (a.id IS NULL OR a."company_id" IS DISTINCT FROM je."company_id");

    IF v_quedan > 0 THEN
        RAISE EXCEPTION
            'Quedan % asientos con la cuenta de otra empresa o inexistente. Se revierte la migracion.', v_quedan;
    END IF;

    RAISE NOTICE '032 post: 0 asientos apuntan a una cuenta de otra empresa.';
END $$;

COMMIT;
