-- =============================================================================
-- 027b2 · DATOS DISPUTADOS (decisiones tomadas con evidencia)
-- =============================================================================
-- Corrige lo que la 027b dejo en disputa. Solo DML (UPDATE), sin DDL.
--
-- HALLAZGO PRINCIPAL
-- `Transaction` tiene TRES columnas de tenant y solo una es buena:
--
--   "tenantId"   32 x ANGELOH7 | 14 x 1 | 3 x TEST1DS | 1 x NULL   <- BUENA
--   "tenant_id"  47 x "cVcLafoZitJmBOdSxNOlPgb0m"       | 3 x NULL   <- BASURA
--   "tenantid"   50 x vacio                                          <- MUERTA
--
-- `tenant_id` tiene la MISMA constante (el tenant de Clinica) en 47 filas sin
-- importar la empresa real: las 46 filas que tienen ambas columnas pobladas
-- difieren en 46. Filtrar por ahi devuelve transacciones de 4 empresas.
-- `Transaction` es la unica tabla del schema con este problema.
--
-- Por que `tenantId` es la buena: coincide con `JournalEntry.tenant_id` en las
-- 50 transacciones, y deja las 50 filas coherentes con su `company_id`.
--
-- ---------------------------------------------------------------------------
-- DECISIONES APLICADAS AQUI
-- ---------------------------------------------------------------------------
-- 1) "Distrubidora Comercial SA" (DICOSA) -> Empresa 1
--    Sus 2 filas en `Purchase` estan en Empresa 1, y `Purchase.company_id` es
--    el campo que ya resulto confiable. Se descarta `Supplier.tenant_id`
--    (ANGELOH7) y el email @dentaldiamondhn.com, que no es evidencia de
--    pertenencia. Los otros dos proveedores (Disnorte, TecnoGlobal) no tienen
--    evidencia en contra, asi que quedan en Empresa 1 sin cambios.
--
-- 2) Transaccion 051e950a -> company_id NULL
--    No tiene NINGUN dato de empresa: `tenantId` es NULL, tiene 0 JournalEntry,
--    su `tenant_id` era la constante falsa y su `reference` esta repetida 6
--    veces. Su company_id venia del backfill roto, no de evidencia. Se deja
--    sin empresa en vez de asignarla a la empresa equivocada: no aparece en
--    ningun libro y no puede filtrarse a una empresa que no le corresponde.
--    (Su clienteRTN identifica a un cliente, no a una empresa: 0 de 23
--    clienteRTN del sistema coinciden con el RTN de alguna empresa.)
-- =============================================================================


BEGIN;


-- -----------------------------------------------------------------------------
-- 1) DICOSA -> Empresa 1
-- -----------------------------------------------------------------------------
-- Se escriben los IDs literales (no por nombre) para que la migracion sea
-- auditable. Las guardas fallan si los datos cambiaron, en vez de escribir a
-- ciegas sobre una fila que ya no es la que se analizo.

DO $$
DECLARE
    -- `text` y no `uuid`: companies.id es text. Supplier.id y Purchase.supplier_id
    -- si son uuid, asi que se castean en la comparacion.
    v_sup text := '693af3cd-ef07-457e-b001-a274417bc110';  -- Distrubidora Comercial SA
    v_emp text := '73d5bbf7-8e47-470e-9430-da513e623ab7';  -- Empresa 1
    v_row record;
    v_filas integer;
BEGIN
    SELECT * INTO v_row FROM "Supplier" WHERE id::text = v_sup;
    IF NOT FOUND THEN
        RAISE EXCEPTION '027b2: el proveedor % ya no existe', v_sup;
    END IF;
    IF v_row."tenant_id" <> 'ANGELOH7' THEN
        RAISE EXCEPTION '027b2: % ahora tiene tenant_id=%, se esperaba ANGELOH7. Revisar antes de aplicar.',
            v_row.name, v_row."tenant_id";
    END IF;
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = v_emp AND "tenant_id" = '1') THEN
        RAISE EXCEPTION '027b2: la empresa destino % no es la de tenant_id=1', v_emp;
    END IF;

    UPDATE "Supplier" SET "company_id" = v_emp WHERE id::text = v_sup;

    -- Solo se acepta si ahora coincide con donde realmente se le compro.
    SELECT count(*) INTO v_filas
      FROM "Purchase" p
      JOIN companies c ON c.id = p."company_id"
     WHERE p."supplier_id"::text = v_sup
       AND c.id <> v_emp;

    IF v_filas > 0 THEN
        RAISE EXCEPTION '027b2: el proveedor tiene % compras en otras empresas, no se atribuye a una sola', v_filas;
    END IF;

    RAISE NOTICE '027b2: % atribuido a Empresa 1 (coincide con sus compras)', v_row.name;
END $$;


-- -----------------------------------------------------------------------------
-- 2) Transaccion 051e950a -> company_id NULL
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    v_tx  text := '051e950a-5f00-43f4-b007-f1991534d76d';  -- Transaction.id es text
    v_row record;
    v_asientos integer;
BEGIN
    SELECT * INTO v_row FROM "Transaction" WHERE id = v_tx;
    IF NOT FOUND THEN
        RAISE EXCEPTION '027b2: la transaccion % ya no existe', v_tx;
    END IF;
    IF v_row."tenantId" IS NOT NULL THEN
        RAISE EXCEPTION '027b2: % ahora tiene tenantId=%, ya no esta sin atribuir. Revisar.',
            v_tx, v_row."tenantId";
    END IF;

    SELECT count(*) INTO v_asientos FROM "JournalEntry" WHERE "transaction_id"::text = v_tx;
    IF v_asientos > 0 THEN
        RAISE EXCEPTION '027b2: % tiene % asientos; sin company_id quedaria fuera de los libros',
            v_tx, v_asientos;
    END IF;

    -- OJO: `tenant_id` se limpia en la MISMA sentencia, y no es cosmetico.
    -- La 023 dejo en Transaction dos triggers `before insert or update` (sin
    -- columna, o sea que disparan en CUALQUIER update):
    --   trg_set_company_id       -> si company_id es null y tenant_id no, lo rellena
    --   trg_set_company_id_camel -> si company_id es null y "tenantId" no, lo rellena
    -- Un `SET company_id = NULL` a secas dispara el primero con el tenant_id
    -- viejo todavia puesto, y el trigger devuelve la empresa al instante: es
    -- imposible dejar company_id en NULL sin limpiar las dos columnas a la vez.
    UPDATE "Transaction"
       SET "company_id" = NULL,
           "tenant_id"  = NULL
     WHERE id = v_tx;

    -- Comprobacion: si un trigger nos lo devolviera, que falle aqui y no en la
    -- verificacion 4b, que daria un error mucho menos informativo.
    SELECT * INTO v_row FROM "Transaction" WHERE id = v_tx;
    IF v_row."company_id" IS NOT NULL OR v_row."tenant_id" IS NOT NULL THEN
        RAISE EXCEPTION '027b2: un trigger restauro company_id=% / tenant_id=% en %',
            v_row."company_id", v_row."tenant_id", v_tx;
    END IF;

    RAISE NOTICE '027b2: transaccion % sin empresa (0 asientos, sin evidencia de empresa)', v_tx;
END $$;


-- -----------------------------------------------------------------------------
-- 3) Transaction.tenant_id  <-  espejo de Transaction.tenantId
-- -----------------------------------------------------------------------------
-- No es una suposicion: se copia la columna que ya demostro ser la correcta.
-- Donde `tenantId` es NULL, `tenant_id` tambien queda NULL, en vez de conservar
-- la constante falsa.
--
-- EXCEPCION: hay un indice unico `unique_voucher_tenant` sobre
-- (voucher_type, voucher_number, tenant_id). Las 3 transacciones de "test 1"
-- comparten (FACTURA, 1) y las tres tienen HOY tenant_id NULL, que es lo unico
-- que hace que el indice no reviente: en un indice unico los NULL no chocan.
-- Al darles tenant_id las tres a la vez, la segunda choca con la primera.
-- Asi que se excluyen con NOT EXISTS y se quedan en NULL, que es honesto: antes
-- apuntaban a Clinica, que es falso; ahora son desconocidas, que es cierto.
-- No se toca el indice: esta migracion no redefine la numeracion de vouchers.

DO $$
DECLARE
    v_filas integer;
BEGIN
    UPDATE "Transaction" t
       SET "tenant_id" = t."tenantId"
     WHERE t."tenantId" IS NOT NULL
       AND t."tenant_id" IS DISTINCT FROM t."tenantId"
       AND NOT EXISTS (
               SELECT 1 FROM "Transaction" o
                WHERE o.id <> t.id
                  AND o."voucher_type"  IS NOT DISTINCT FROM t."voucher_type"
                  AND o."voucher_number" IS NOT DISTINCT FROM t."voucher_number"
                  AND o."tenantId"       = t."tenantId"
           );

    GET DIAGNOSTICS v_filas = ROW_COUNT;
    RAISE NOTICE '027b2: % transacciones con tenant_id sincronizado', v_filas;
END $$;

DO $$
DECLARE
    v_filas integer;
BEGIN
    UPDATE "Transaction" t
       SET "tenant_id" = NULL
     WHERE t."tenantId" IS NULL
       AND t."tenant_id" IS NOT NULL;

    GET DIAGNOSTICS v_filas = ROW_COUNT;
    RAISE NOTICE '027b2: % transacciones sin tenant quedó con tenant_id NULL', v_filas;
END $$;

-- Las que quedaron sin sincronizar por el indice unico, para que queden
-- documentadas y no se confundan con un forgetting.
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT t.id, t."tenantId", t."voucher_type", t."voucher_number",
               t."voucherNumber", t."voucherType"
          FROM "Transaction" t
         WHERE t."tenantId" IS NOT NULL
           AND t."tenant_id" IS DISTINCT FROM t."tenantId"
    LOOP
        RAISE NOTICE 'queda sin sincronizar: % | tenantId=% | (% / % snake) vs (% / % real)',
            r.id, r."tenantId", r."voucher_type", r."voucher_number",
            r."voucherType", r."voucherNumber";
    END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- 4) VERIFICACION
-- -----------------------------------------------------------------------------

-- 4a) Invariante: NINGUNA fila con `tenant_id` no nulo puede contradecir su
--     `tenantId`. Es mas fuerte y mas correcto que "ambos dan el mismo count":
--     `TEST1DS` va a dar 3 con `tenantId` y 0 con `tenant_id`, porque sus 3
--     filas quedaron NULL a proposito para no chocar con `unique_voucher_tenant`.
--     Un count igual en ambos no seria la garantia que importa: lo que importa
--     es que `tenant_id` jamas apunte a una empresa a la que la fila no pertenece.
DO $$
DECLARE
    v_malas integer;
    r       record;
    v_t     text;
    v_a     integer;
    v_b     integer;
BEGIN
    SELECT count(*) INTO v_malas
      FROM "Transaction" t
     WHERE t."tenant_id" IS NOT NULL
       AND t."tenant_id" IS DISTINCT FROM t."tenantId";

    IF v_malas > 0 THEN
        RAISE EXCEPTION '027b2: % filas con tenant_id no nulo que contradicen su tenantId', v_malas;
    END IF;

    FOR r IN
        SELECT "tenantId" AS t FROM "Transaction"
         WHERE "tenantId" IS NOT NULL
         GROUP BY "tenantId" ORDER BY 1
    LOOP
        v_t := r.t;
        SELECT count(*) INTO v_a FROM "Transaction" WHERE "tenantId"  = v_t;
        SELECT count(*) INTO v_b FROM "Transaction" WHERE "tenant_id" = v_t;
        RAISE NOTICE '  tenant % -> tenantId=%  tenant_id=%  (sin sincronizar: %)',
            v_t, v_a, v_b, v_a - v_b;
    END LOOP;

    RAISE NOTICE '027b2 OK: 0 contradicciones entre tenant_id y tenantId';
END $$;

-- 4b) Cada transaction con company_id debe pertenecer a una empresa con ESE
--     tenant. Con NOT EXISTS y no con JOIN a propósito: `TEST1DS` tiene dos
--     empresas (test 1 y test 2), así que un JOIN por tenant_id duplica cada
--     fila de test 1 y daría 3 falsos positivos, con lo que esta verificación
--     tiraría la migración entera hacia atrás.
DO $$
DECLARE
    v_malas integer;
    v_sin   integer;
    v_ambig integer;
BEGIN
    SELECT count(*) INTO v_malas
      FROM "Transaction" t
     WHERE t."company_id" IS NOT NULL
       AND NOT EXISTS (
               SELECT 1 FROM companies c
                WHERE c."tenant_id" = t."tenantId"
                  AND c.id = t."company_id"
           );

    SELECT count(*) INTO v_sin
      FROM "Transaction" WHERE "company_id" IS NULL;

    SELECT count(*) INTO v_ambig
      FROM "Transaction" t
     WHERE t."tenantId" IS NOT NULL
       AND (SELECT count(*) FROM companies c WHERE c."tenant_id" = t."tenantId") > 1;

    IF v_malas > 0 THEN
        RAISE EXCEPTION '027b2: % transacciones siguen con company_id incorrecto', v_malas;
    END IF;
    RAISE NOTICE '027b2 OK: % company_id incorrectos | % sin empresa | % en tenants multiempresa (TEST1DS)',
        v_malas, v_sin, v_ambig;
END $$;

-- 4c) Ningun supplier debe apuntar a una empresa que no sea la de su tenant,
--     salvo los que se atribuyeron por compras.
DO $$
DECLARE
    r       record;
    v_malas integer := 0;
BEGIN
    FOR r IN
        SELECT s.name, s."tenant_id", c."tenant_id" AS tenant_de_la_empresa
          FROM "Supplier" s
          JOIN companies c ON c.id = s."company_id"
         WHERE s."tenant_id" IS DISTINCT FROM c."tenant_id"
    LOOP
        v_malas := v_malas + 1;
        RAISE NOTICE '  supplier % : tenant=% pero empresa tenant=%', r.name, r."tenant_id", r.tenant_de_la_empresa;
    END LOOP;
    RAISE NOTICE '027b2: % suppliers con tenant distinto al de su empresa', v_malas;
END $$;


COMMIT;
