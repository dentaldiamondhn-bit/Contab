-- ============================================================================
-- 039 - Borrar las 8 cuentas legacy de public."Account"
-- ----------------------------------------------------------------------------
-- PENDIENTE DE APLICAR (version corregida). El primer intento ABORTO con
-- "se esperaban 8 bajas, hubo 0", y como todo va en una transaccion, no se
-- escribio nada. Antes de volver a correrla, conviene medir por que no habia
-- nada que borrar: lo normal es que la 030 ya las eliminara, pero si las 8
-- siguen ahi con otra forma, el problema es distinto. La consulta esta al final
-- del archivo.
--
-- Que son estas 8 filas (medido 1 Oct 2026 por PostgREST):
--   id 58477138... '1101' Caja y Bancos
--   id c48394ae... '4101' Ingresos por Servicios
--   id ffdc3764... '1102' Banco BAC
--   id acc-inventario       '1301' Inventario
--   id acc-activos-fijos    '1501' Activos Fijos
--   id acc-servicios        '5102' Servicios Profesionales
--   id acc-alquiler         '5201' Alquiler de Oficina
--   id acc-isv-por-pagar    '2201' ISV por Pagar
--   Todas con company_id IS NULL y tenantid = ''.
--
-- Por que sobrar (y no se pueden asignar a una empresa):
--   Son las cuentas ORIGINALES compartidas pre-030. La migracion 030 "dividir
--   cuentas compartidas por empresa" ya creo copias por empresa de 1101/4101
--   (Angelos 47a98a0e/0fed60e6, test 1 8ad87b49/52ec2fd9, Empresa 1
--   9842069a/e3fe4d2c), y `chart_of_accounts` (la tabla viva) tambien tiene sus
--   propias filas por empresa. Las filas NULL no pertenecen a ningun tenant ni
--   empresa: son residuo. `Account` es solo fallback legacy de
--   `chart_of_accounts` (ver app/api/accounting/opening-balances/route.ts).
--
-- Seguridad (medido): la unica tabla con filas que apunta a esos 8 ids es
--   `account_audit_log` (4 filas historicas de OPENING_BALANCE_UPDATE). El resto
--   de columnas tipo account_id (Reconciliation, JournalEntry x3, TaxConfig,
--   etc.) tiene 0 filas apuntando a ellas. Por eso se borra tambien su auditoria
--   para no dejar referencias colgando ni chocar con una FK restrict.
--
-- Idempotente: si las filas ya no existen, avisa y no falla.
-- No hay drift de Prisma que sincronizar: estas filas no estan en schema.prisma.
--
-- CORREGIDO TRAS UN PRIMER INTENTO FALLIDO (2 Oct 2026)
-- La primera version se ejecuto y fallo:
--   ERROR: P0001: 039: se esperaban 8 bajas, hubo 0. Abortar.
--   CONTEXT: PL/pgSQL function inline_code_block line 12 at RAISE
-- "line 12" es exactamente el RAISE EXCEPTION del bloque 2.
--
-- La causa era el propio mecanismo de idempotencia. El bloque 0 terminaba con
-- `IF n = 0 THEN RAISE NOTICE '...'; RETURN; END IF;`, y **un `RETURN` en
-- PL/pgSQL solo sale de ESE bloque**: los bloques 1, 2 y 3 se ejecutaban igual.
-- Con las cuentas ya ausentes, el 0 avisaba, el 1 y el 2 no hacian nada, y el 2
-- comparaba 0 contra 8 y abortaba. O sea que la cabecera anunciaba una
-- idempotencia que el codigo no tenia.
--
-- Ahora el preflight deja el resultado en `mig_039_skip` y `mig_039_total`
-- (settings de sesion LOCALES a la transaccion, asi que no sobreviven al
-- COMMIT) y los bloques 1, 2 y 3 se saltan con un `RETURN` propio. Ademas el
-- bloque 2 compara contra lo que el preflight ENCONTRO, no contra 8 fijo: si
-- solo quedan 5 de las 8, borrar 5 es correcto y abortar seria un falso
-- negativo que dejaria la migracion a medias sin motivo.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Preflight: las filas deben existir y seguir sin empresa
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  n int;
  con_empresa int;
  con_asientos int;
BEGIN
  -- El resultado del preflight se pasa a los bloques siguientes con settings de
  -- sesion LOCALES a la transaccion.
  --
  -- Antes se usaba un `RETURN` para marcar "no hay nada que hacer", y eso es un
  -- bug: un RETURN solo sale de ESTE bloque. Los bloques 1 y 2 se ejecutaban
  -- igual, y el 2 abortaba con "se esperaban 8 bajas, hubo 0". El guard de
  -- idempotencia que anunciaba la cabecera no guardaba nada, y de hecho la
  -- cabecera miente sobre ello.
  PERFORM set_config('mig_039_total', '0', true);
  PERFORM set_config('mig_039_skip', '0', true);

  SELECT count(*) INTO n FROM public."Account"
  WHERE id IN ('58477138-323b-4248-8785-4e0e0956b26f','c48394ae-3aef-4d86-ad5b-a89f8718b5d0',
               'ffdc3764-2d5b-490b-9451-16ab79df48ec','acc-inventario','acc-activos-fijos',
               'acc-servicios','acc-alquiler','acc-isv-por-pagar');

  IF n = 0 THEN
    RAISE NOTICE '039: ya no existen las 8 cuentas legacy; nada que hacer.';
    PERFORM set_config('mig_039_skip', '1', true);
    RETURN;
  END IF;

  SELECT count(*) INTO con_empresa FROM public."Account"
  WHERE id IN ('58477138-323b-4248-8785-4e0e0956b26f','c48394ae-3aef-4d86-ad5b-a89f8718b5d0',
               'ffdc3764-2d5b-490b-9451-16ab79df48ec','acc-inventario','acc-activos-fijos',
               'acc-servicios','acc-alquiler','acc-isv-por-pagar')
    AND company_id IS NOT NULL;

  IF con_empresa > 0 THEN
    RAISE EXCEPTION '039: % de las 8 cuentas ya tienen company_id; alguien las reasigno. Abortar para revisar.', con_empresa;
  END IF;

  -- GUARDA CRITICA (AGENTS.md seccion 5): antes de la 030, 1101 y 4101 tenian
  -- 42 y 23 asientos reales de tres empresas. La 030 los reapunto a las copias
  -- por empresa y por eso hoy deben estar en 0. Si algun asiento vuelve a
  -- apuntar a estas cuentas, NO se borran.
  SELECT count(*) INTO con_asientos FROM public."JournalEntry"
  WHERE account_id IN ('58477138-323b-4248-8785-4e0e0956b26f','c48394ae-3aef-4d86-ad5b-a89f8718b5d0',
                       'ffdc3764-2d5b-490b-9451-16ab79df48ec','acc-inventario','acc-activos-fijos',
                       'acc-servicios','acc-alquiler','acc-isv-por-pagar')
     OR "accountId" IN ('58477138-323b-4248-8785-4e0e0956b26f','c48394ae-3aef-4d86-ad5b-a89f8718b5d0',
                        'ffdc3764-2d5b-490b-9451-16ab79df48ec','acc-inventario','acc-activos-fijos',
                        'acc-servicios','acc-alquiler','acc-isv-por-pagar')
     OR accountid IN ('58477138-323b-4248-8785-4e0e0956b26f','c48394ae-3aef-4d86-ad5b-a89f8718b5d0',
                      'ffdc3764-2d5b-490b-9451-16ab79df48ec','acc-inventario','acc-activos-fijos',
                      'acc-servicios','acc-alquiler','acc-isv-por-pagar');

  IF con_asientos > 0 THEN
    RAISE EXCEPTION '039: % asientos todavia apuntan a las cuentas legacy (la 030 debia reapuntarlos). Abortar.', con_asientos;
  END IF;

  -- Lo que se encontro es lo que el bloque 2 tiene que borrar. Se pasa por
  -- setting y no como constante para que ambos coincidan siempre.
  PERFORM set_config('mig_039_total', n::text, true);

  IF n <> 8 THEN
    RAISE NOTICE '039: se encontraron % de 8 cuentas legacy (el resto ya no existe).', n;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. Borrar la auditoria historica de esas 8 cuentas
-- ----------------------------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  IF current_setting('mig_039_skip', true) = '1' THEN
    RAISE NOTICE '039: sin cuentas legacy, no hay auditoria que borrar.';
    RETURN;
  END IF;

  DELETE FROM public.account_audit_log
  WHERE account_id IN ('58477138-323b-4248-8785-4e0e0956b26f','c48394ae-3aef-4d86-ad5b-a89f8718b5d0',
                       'ffdc3764-2d5b-490b-9451-16ab79df48ec','acc-inventario','acc-activos-fijos',
                       'acc-servicios','acc-alquiler','acc-isv-por-pagar');
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE '039: auditoria borrada = % filas', n;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Borrar las 8 cuentas
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  n        int;
  esperado int;
BEGIN
  IF current_setting('mig_039_skip', true) = '1' THEN
    RAISE NOTICE '039: sin cuentas legacy que borrar.';
    RETURN;
  END IF;

  -- Se compara contra lo que el preflight ENCONTRO, no contra 8 fijo: si solo
  -- quedaban 5 de las 8, borrar 5 es el resultado correcto y abortar seria un
  -- falso negativo que dejaria la migracion a medias sin motivo.
  esperado := current_setting('mig_039_total', true)::int;

  DELETE FROM public."Account"
  WHERE id IN ('58477138-323b-4248-8785-4e0e0956b26f','c48394ae-3aef-4d86-ad5b-a89f8718b5d0',
               'ffdc3764-2d5b-490b-9451-16ab79df48ec','acc-inventario','acc-activos-fijos',
               'acc-servicios','acc-alquiler','acc-isv-por-pagar')
    AND company_id IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE '039: cuentas borradas = % filas (el preflight encontro %)', n, esperado;
  IF n <> esperado THEN
    RAISE EXCEPTION '039: el preflight encontro % y se borraron %. Abortar.', esperado, n;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Post-check: Account no debe quedar ninguna fila con company_id NULL
-- ----------------------------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  IF current_setting('mig_039_skip', true) = '1' THEN
    RAISE NOTICE '039: sin cuentas legacy, post-check omitido.';
    RETURN;
  END IF;

  SELECT count(*) INTO n FROM public."Account" WHERE company_id IS NULL;
  RAISE NOTICE '039: filas de Account con company_id NULL = %', n;
  IF n > 0 THEN
    RAISE NOTICE '039: quedan % cuentas sin empresa; revisar si son nuevas o de otra fuente.', n;
  ELSE
    RAISE NOTICE '039: OK, Account 100%% aislado por company_id.';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- DIAGNOSTICO DEL PRIMER INTENTO: por que "hubo 0 bajas"
-- Ejecutar esto ANTES de la version corregida. Es de solo lectura.
--
--   SELECT 'las 8 por id' AS chequeo,
--          count(*) FILTER (WHERE id IN ('58477138-323b-4248-8785-4e0e0956b26f',
--                  'c48394ae-3aef-4d86-ad5b-a89f8718b5d0','ffdc3764-2d5b-490b-9451-16ab79df48ec',
--                  'acc-inventario','acc-activos-fijos','acc-servicios','acc-alquiler',
--                  'acc-isv-por-pagar')) AS n
--     FROM public."Account"
--   UNION ALL
--   SELECT 'Account sin company_id', count(*) FROM public."Account" WHERE company_id IS NULL
--   UNION ALL
--   SELECT 'Account totales', count(*) FROM public."Account"
--   UNION ALL
--   SELECT 'codigos 1101/4101/1102', count(*) FROM public."Account"
--    WHERE code IN ('1101','4101','1102');
--
-- Como leerlo:
--   - "las 8 por id" = 0  -> las filas ya no existen. Lo normal: la 030 las borro
--     al dividir las compartidas. Entonces la 039 ya no tiene nada que hacer y
--     con el fix solo dara NOTICE.
--   - "las 8 por id" = 8 y "sin company_id" = 8 -> NO deberia haber dado 0
--     bajas. Si da esto, el DELETE no se ejecuto: casi seguro porque la
--     transaccion ya estaba abortada por un error anterior en la misma tanda.
--     Ojo con esto: el SQL Editor puede mandar varios statments juntos, y si
--     uno falla los siguientes dan "current transaction is aborted". El error
--     que se ve es el PRIMERO, no el de la 039.
--   - "Account sin company_id" > 0 con "las 8 por id" = 0 -> hay OTRAS filas sin
--     empresa que no son estas 8. No las borra esta migracion: son de otra
--     fuente y hay que mirarlas una a una.
-- ============================================================================
