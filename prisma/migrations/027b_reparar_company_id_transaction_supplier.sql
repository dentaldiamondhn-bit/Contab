-- =============================================================================
-- 027b — Reparar company_id en Transaction y Supplier
--
-- POR QUE ESTA MIGRACION EXISTE
--
-- La 027 aisló 25 vistas y dejó 4 en cero (libro_diario_honduras y las tres
-- vista_estado*/comparativo). La causa NO era el filtro: era el dato.
--
-- Medido contra la base real antes de escribir esto:
--
--   Tabla          company_id coherente con su propio tenant
--   ------------   ------------------------------------------------
--   JournalEntry   CONFIABLE   101/101
--   Invoice        CONFIABLE     3/3
--   Purchase       CONFIABLE     2/2
--   Account        CONFIABLE    35/35  (+8 NULL legacy, aparte)
--   Transaction    NO CONFIABLE  4/50      <<< esta
--   Supplier       NO CONFIABLE  0/3       <<< esta
--
-- 46 de 50 transacciones tienen company_id de Clinica Dental Diamond
-- (cVcLafoZitJmBOdSxNOlPgb0m) mientras su propia fila dice tenant '1' o
-- 'ANGELOH7'. Es decir: se atribuyeron casi todas al mismo lado.
--
-- POR QUE NO SE PUEDE AISLAR ANTES DE ESTO
--
-- Las 4 funciones pendientes (get_libro_diario_integrado,
-- get_egresos_with_entries, get_ingresos_with_entries,
-- get_resumen_ingresos_egresos) filtran por t."voucherType" sobre Transaction.
-- Si se les pusiera `AND t.company_id = p_company_id` HOY, de las 45
-- transacciones INGRESO/EGRESO:
--
--   Clinica Dental Diamond veria 42  (que en realidad son de Empresa 1 y Angelos)
--   Angelos veria 0
--   Empresa 1 veria 0
--
-- O sea: se instalaria una fuga PEOR que la actual, y ademas parecería correcta
-- porque el filtro por company_id estaría ahí. Por eso el orden es:
-- primero 027b (esta), después 027c (aislar las 4 funciones).
--
-- DE DONDE SALE EL DATO BUENO
--
-- JournalEntry es la única fuente coherente (101/101). Y se comprobó que los
-- asientos de una misma transacción NO se reparten entre empresas:
--
--   47 de 50 transacciones -> todos sus asientos apuntan a UNA sola empresa
--    0 de 50 transacciones -> asientos apuntando a VARIAS empresas
--    3 de 50 transacciones -> sin ningún JournalEntry (caen al tenant)
--
-- Con eso la reparación es DETERMINISTA, no una heurística: el asiento pertenece
-- a la empresa de su transacción, y la transacción toma la empresa de sus
-- asientos. Simulación completa del resultado:
--
--   ANTES:   Clinica Dental Diamond=47  test 1=3
--   DESPUÉS: Angelos=32  Empresa 1=14  test 1=3  Clinica Dental Diamond=1
--   46 de 50 filas cambian.  Validación: 50/50 coherentes, 0 incoherentes.
--
-- El mismo simulador confirma que los 3 "sin asientos" no caen en TEST1DS, que
-- es el único tenant con DOS empresas, así que la ambigüedad real es 0. La
-- migración igual aborta si aparece, en vez de elegir una.
--
-- OJO CON Transaction: TIENE TRES JUEGOS DE COLUMNAS DUPLICADAS Y SE CONTRADICEN
--
--   tenantId="1"          tenant_id="cVcLafoZitJmBOdSxNOlPgb0m"  tenantid=""
--   totalAmount=517500    total_amount=0                          totalamount=null
--
-- "cVcLafoZitJmBOdSxNOlPgb0m" es a la vez companies.id y companies.tenant_id de
-- Clinica, por eso esa fila parece coherente y esconde el problema. Para las
-- columnas de tenant se usa SOLO "tenantId" (camelCase): es la que coincide con
-- la de JournalEntry. Y NO se tocan totalAmount/total_amount/totalamount: son un
-- problema aparte, y meterlos aquí mezclaría dos cosas en la misma migración.
--
-- ESTADO: PENDIENTE de que la aplique el usuario en Supabase SQL Editor.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. PRECONDICIONES
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_faltan text;
BEGIN
  SELECT string_agg(t, ', ' ORDER BY t) INTO v_faltan
  FROM unnest(ARRAY['Transaction', 'JournalEntry', 'Supplier', 'companies']) AS t
  WHERE to_regclass(format('public.%I', t)) IS NULL;

  IF v_faltan IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTA: no existen estas tablas: %', v_faltan;
  END IF;

  -- Transaction y JournalEntry usan "transactionId" en camelCase. Si la
  -- migration 025 lo normalizó a transaction_id, este UPDATE no encontraría
  -- nada y creería que todo está bien. Mejor fallar fuerte.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'JournalEntry' AND column_name = 'transactionId'
  ) THEN
    RAISE EXCEPTION 'ABORTA: JournalEntry."transactionId" no existe. Revisar el casing antes de aplicar.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Transaction' AND column_name = 'tenantId'
  ) THEN
    RAISE EXCEPTION 'ABORTA: Transaction."tenantId" no existe. El fallback por tenant no seria posible.';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 0b. AMBIGÜEDAD: si un asiento de una transacción dice una empresa y otro dice
--     otra, NO se puede decidir. Se aborta en vez de elegir una al azar.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_ambiguas int;
  v_filas    int;
BEGIN
  SELECT count(*), coalesce(sum(n), 0) INTO v_ambiguas, v_filas
  FROM (
    SELECT "transactionId" AS tid, count(DISTINCT company_id) AS n
    FROM "JournalEntry"
    WHERE "transactionId" IS NOT NULL
      AND company_id IS NOT NULL
    GROUP BY "transactionId"
    HAVING count(DISTINCT company_id) > 1
  ) x;

  IF v_ambiguas > 0 THEN
    RAISE EXCEPTION
      'ABORTA: % transacciones tienen asientos que apuntan a mas de una empresa (% asientos). No se puede atribuir sin decision humana.',
      v_ambiguas, v_filas;
  END IF;

  RAISE NOTICE 'preflight ok: 0 transacciones con asientos repartidos entre empresas';
END $$;

-- -----------------------------------------------------------------------------
-- 1. Transaction: la empresa es la de sus propios asientos
-- -----------------------------------------------------------------------------
-- min(company_id) es seguro porque el preflight garantiza que por transactionId
-- hay como mucho UN company_id distinto. No es un "quedarse con el primero".

UPDATE "Transaction" t
SET company_id = src.company_id
FROM (
  SELECT "transactionId" AS tid,
         min(company_id)   AS company_id
  FROM "JournalEntry"
  WHERE "transactionId" IS NOT NULL
    AND company_id IS NOT NULL
  GROUP BY "transactionId"
  HAVING count(DISTINCT company_id) = 1
) src
-- Se castean los dos lados a text a proposito: hoy Transaction.id y
-- JournalEntry."transactionId" son ambos string, pero si uno cambiara a uuid el
-- `=` reventaria con "operator does not exist" (ya ha pasado en este proyecto).
WHERE t.id::text = src.tid::text
  AND t.company_id IS DISTINCT FROM src.company_id;

-- -----------------------------------------------------------------------------
-- 2. Transaction sin asientos (3 filas): se atribuyen por su tenant
-- -----------------------------------------------------------------------------
-- Si el tenant tiene más de una empresa NO se elige: se dejan como están y se
-- avisa. Hoy son 3 filas y ninguna en TEST1DS, así que esto no debería aplicar.

DO $$
DECLARE
  v_ambiguos  int;
  v_company   text;
  r           record;
BEGIN
  FOR r IN
    SELECT t.id, t."tenantId" AS tenant, t.company_id AS actual
    FROM "Transaction" t
    LEFT JOIN "JournalEntry" je ON je."transactionId" = t.id
    WHERE je.id IS NULL
      AND t."tenantId" IS NOT NULL AND t."tenantId" <> ''
  LOOP
    SELECT c.id INTO v_company
    FROM companies c
    WHERE c.tenant_id = r.tenant;

    IF v_company IS NULL THEN
      RAISE NOTICE 'sin empresa para el tenant % (transaccion %): se deja como esta', r.tenant, left(r.id::text, 8);
    ELSIF EXISTS (SELECT 1 FROM companies c2 WHERE c2.tenant_id = r.tenant AND c2.id <> v_company) THEN
      -- Tenant con varias empresas: NO se decide aquí.
      RAISE NOTICE 'tenant % tiene varias empresas: transaccion % queda SIN CAMBIAR (pedir decision)',
        r.tenant, left(r.id::text, 8);
    ELSIF v_company IS DISTINCT FROM r.actual THEN
      UPDATE "Transaction" SET company_id = v_company WHERE id = r.id;
      RAISE NOTICE 'sin asientos, atribuido por tenant %: transaccion % -> %', r.tenant, left(r.id::text, 8), left(v_company, 8);
    END IF;
  END LOOP;

  SELECT count(*) INTO v_ambiguos
  FROM "Transaction" t
  WHERE t.company_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = t.company_id);
  IF v_ambiguos > 0 THEN
    RAISE NOTICE 'ATENCION: % transacciones con company_id que no existe en companies', v_ambiguos;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Supplier: company_id guardaba el CODIGO DE TENANT, no el id de empresa
-- -----------------------------------------------------------------------------
-- Medido: las 3 filas tienen company_id='ANGELOH7' / 'TEST1DS', que son
-- companies.tenant_id, no companies.id. Es la convención mixta que la 023
-- normalizó en product/Invoice/Account/cai/warehouse/Transaction/Purchase/
-- talonarios y se le pasó en Supplier.
--
-- PERO LOS DATOS SE CONTRADICEN, y la primera versión de esta sección no lo
-- detectó y por eso abortó al verificar. Medido:
--
--   nombre      tenant_id   company_id   contradiction
--   DICOSA      ANGELOH7    ANGELOH7     sus 2 Purchase son de Empresa 1
--   Disnorte    1           TEST1DS      la fila dice 1, el company_id dice TEST1DS
--   TecnoGlobal 1           TEST1DS      la fila dice 1, el company_id dice TEST1DS
--
-- Y TEST1DS tiene DOS empresas (test 1 y test 2), así que ni siquiera se puede
-- usar el company_id viejo como pista.
--
-- Criterio: se sigue el tenant_id DE LA FILA, no el company_id viejo, porque
-- company_id ya se demonstró que guarda otra cosa. Solo se remapea si ese tenant
-- tiene EXACTAMENTE una empresa. Si tiene cero o varias, se deja la fila como
-- está y se avisa: es una decisión de negocio, no técnica.
--
-- Cuando el company_id viejo apuntaba a un tenant DISTINTO del de la fila, se
-- avisa con las dos referencias, porque el dato se contradecía y gana el
-- tenant_id. Eso es reversible y queda a la vista.

DO $$
DECLARE
  r              record;
  v_company      text;
  v_n            int;
  v_tocados      text[] := ARRAY[]::text[];
  v_pendientes   text[] := ARRAY[]::text[];
  v_contradic    text[] := ARRAY[]::text[];
  v_tenant_viejo text;
  v_bad_antes    int;
  v_bad_despues  int;
BEGIN
  -- foto del "antes", para poder afirmar que la sección no empeoró nada
  SELECT count(*) INTO v_bad_antes
  FROM "Supplier" s
  WHERE s.company_id IS NOT NULL
    AND s.tenant_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = s.company_id AND c.tenant_id = s.tenant_id);

  FOR r IN
    SELECT s.id, s.company_id AS actual, s.tenant_id AS tenant
    FROM "Supplier" s
    WHERE s.company_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = s.company_id)
  LOOP
    SELECT count(*), min(c.id) INTO v_n, v_company
    FROM companies c
    WHERE c.tenant_id = r.tenant;

    IF v_n = 0 THEN
      v_pendientes := v_pendientes || r.id::text;
      RAISE NOTICE 'Supplier %: su tenant_id=% no corresponde a ninguna empresa; se deja sin tocar (decision pendiente)',
        left(r.id::text, 8), r.tenant;
    ELSIF v_n > 1 THEN
      v_pendientes := v_pendientes || r.id::text;
      RAISE NOTICE 'Supplier %: el tenant % tiene % empresas; NO se decide aqui (decision pendiente)',
        left(r.id::text, 8), r.tenant, v_n;
    ELSE
      SELECT c2.tenant_id INTO v_tenant_viejo FROM companies c2 WHERE c2.tenant_id = r.actual;

      UPDATE "Supplier" SET company_id = v_company WHERE id = r.id;
      v_tocados := v_tocados || r.id::text;

      RAISE NOTICE 'Supplier %: company_id % -> % (empresa del tenant %)',
        left(r.id::text, 8), r.actual, left(v_company, 8), r.tenant;

      IF v_tenant_viejo IS NOT NULL AND v_tenant_viejo <> r.tenant THEN
        v_contradic := v_contradic || r.id::text;
        RAISE NOTICE '  AVISO: el company_id viejo apuntaba al tenant %, no al % de la fila. Gano el tenant_id de la fila; CONFIRMAR.',
          v_tenant_viejo, r.tenant;
      END IF;
    END IF;
  END LOOP;

  -- Lo que esta sección TOCÓ tiene que haber quedado coherente. Si no, aborta:
  -- sería un fallo nuestro, no un dato heredado.
  IF array_length(v_tocados, 1) IS NOT NULL THEN
    SELECT count(*) INTO v_bad_despues
    FROM "Supplier" s
    WHERE s.id::text = ANY(v_tocados)
      AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = s.company_id AND c.tenant_id = s.tenant_id);

    IF v_bad_despues > 0 THEN
      RAISE EXCEPTION
        'ABORTA: esta migracion toco % suppliers y % quedaron incoherentes. Es un fallo de la migracion, no un dato previo.',
        array_length(v_tocados, 1), v_bad_despues;
    END IF;
  END IF;

  -- Y la tabla no puede haber empeorado.
  SELECT count(*) INTO v_bad_despues
  FROM "Supplier" s
  WHERE s.company_id IS NOT NULL
    AND s.tenant_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = s.company_id AND c.tenant_id = s.tenant_id);

  IF v_bad_despues > v_bad_antes THEN
    RAISE EXCEPTION
      'ABORTA: los suppliers incoherentes pasaron de % a %. La migracion los empeoro.',
      v_bad_antes, v_bad_despues;
  END IF;

  RAISE NOTICE 'Supplier: % reparados, % sin tocar por ambiguedad, % con dato contradictorio',
    coalesce(array_length(v_tocados, 1), 0),
    coalesce(array_length(v_pendientes, 1), 0),
    coalesce(array_length(v_contradic, 1), 0);
  RAISE NOTICE 'Supplier: incoherentes antes=%, despues=% (los que quedan son datos heredados, no de esta migracion)',
    v_bad_antes, v_bad_despues;

  IF array_length(v_pendientes, 1) IS NOT NULL THEN
    RAISE NOTICE 'PENDIENTE DE DECISION HUMANA: suppliers %', array_to_string(v_pendientes, ', ');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. VERIFICACION DE Transaction
-- -----------------------------------------------------------------------------
-- Aquí sí se exige el 0 absoluto: la reparación de Transaction es determinista
-- (47 de 50 con una sola empresa en sus asientos, 0 repartidas) y no depende de
-- datos en disputa. Supplier va aparte porque sí los tiene.

DO $$
DECLARE
  v_tx_bad  int;
  v_det     text;
BEGIN
  SELECT count(*), string_agg(DISTINCT t."tenantId" || ' -> ' || left(t.company_id::text, 8), ', ') INTO v_tx_bad, v_det
  FROM "Transaction" t
  WHERE t.company_id IS NOT NULL
    AND t."tenantId" IS NOT NULL AND t."tenantId" <> ''
    AND NOT EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = t.company_id AND c.tenant_id = t."tenantId"
    );

  IF v_tx_bad > 0 THEN
    RAISE EXCEPTION
      'ABORTA al verificar: % transacciones incoherentes. Detalle: %',
      v_tx_bad, coalesce(v_det, '-');
  END IF;

  RAISE NOTICE 'Transaction: 0 incoherentes.';
END $$;

COMMIT;
