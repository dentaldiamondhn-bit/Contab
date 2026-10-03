-- =============================================================================
-- 027_vistas_contables_aisladas.sql
-- Aísla por company_id las VISTAS CONTABLES que hoy mezclan empresas.
--
-- POR QUE ESTO NO ES "PONER UN WHERE MAS"
-- --------------------------------------
-- Las tablas base ya están aisladas desde la 023/025. El agujero estaba en las
-- vistas, y no es un `where` que falte: es que varias suman asientos de TODAS
-- las empresas. Medido contra el esquema real:
--
--   1. `balance_general`, `libro_mayor`, `balanza_comprobacion`,
--      `estado_resultados` y `resumen_contable` hacen
--      `LEFT JOIN "JournalEntry" je ON ...` SIN NINGUN FILTRO. El lado `je` no
--      tiene ni `company_id` ni `tenant_id`: cada cuenta suma los asientos de
--      todas las empresas. Un balance general con saldos cruzados.
--
--   2. `declaracion_mensual`, `resumen_isv`, `top_clientes`,
--      `flujo_efectivo_mensual` y `vista_resumen_cuentas` hacen
--      `GROUP BY "tenantId"`. Y un tenant tiene varias empresas: test 1 y test 2
--      comparten 'TEST1DS'. Esa agrupacion NO separa empresas, las SUMA. Por eso
--      aqui el group by va por `company_id`, no por tenant.
--
--   3. `JournalEntry` tiene TRES convenciones de cada columna
--      (`accountId` / `account_id` / `accountid`, y lo mismo para transaccion).
--      El `ON ... OR ...` de las vistas solo mira dos de las tres.
--
-- QUE DEJA EXPUESTA CADA VISTA
-- ----------------------------
-- Se anade `company_id` (y `location_id` donde la tabla base lo tiene) al final
-- de la lista de columnas, para que la ruta pueda filtrar con `.eq('company_id')`.
-- Sin esa columna en el SELECT, PostgREST no puede filtrar la vista: no hay por
-- donde. Append es lo unico que permite `CREATE OR REPLACE VIEW` sin romper las
-- vistas que dependen de estas.
--
-- EL RLS NO PROTEGE ESTO
-- ----------------------
-- Las rutas usan `SUPABASE_SERVICE_ROLE_KEY`, que salta el RLS. Poner
-- `security_invoker` en las vistas no serviria de nada contra service_role. La
-- unica defensa real es que la ruta filtre por `company_id`; por eso el SELECT
-- de cada vista lleva la columna y al final se avisa de las rutas pendientes.
--
-- MEDIDO ANTES DE ESCRIBIR ESTA MIGRACION (no supuesto)
-- -----------------------------------------------------
-- Un filtro estricto `je.company_id = a.company_id` BORRA en silencio las filas
-- que tengan company_id NULL: no da error, el reporte sale mas corto. Se
-- compruebo con conteo exacto sobre la BD real:
--
--   JournalEntry 0 NULL   Transaction 0   Invoice 0   InvoicePayment 0
--   Purchase 0            Supplier 0      product 0   warehouse 0
--   Account     8 NULL
--
-- Es decir: los filtros estrictos de esta migracion NO pierden datos. Las 8
-- cuentas con company_id NULL son las huerfanas de los tenants `tenant_001` y
-- `default-tenant`, que no existen en `companies` (ver AGENTS.md seccion 5). Con
-- el ON restrictivo aparecen con saldo 0 en vez de arrastrar asientos de otras
-- empresas, que es lo correcto.
--
-- Tambien se comprobo que en JournalEntry la columna `accountid` NUNCA es la
-- unica poblada: en la muestra de 101 filas las 101 traen `accountId`. Por eso
-- el `ON (je.account_id = a.id OR je."accountId" = a.id)` ya cubre todo y no
-- hace falta ampliarlo.
--
-- LO QUE ESTA MIGRACION NO TOCA (y por que)
-- -----------------------------------------
--   * `libro_diario_integrado`, `libro_egresos`, `libro_ingresos` y
--     `resumen_ingresos_egresos` son `SELECT * FROM una_funcion()`. Aislar la
--     vista no aisla la funcion: hay que tocar el cuerpo, que no se tiene aqui.
--   * `vista_resumen_produccion` lee `itr_produccion`, que NO tiene `company_id`
--     NI ninguna columna de tenant. No hay de donde deducir la empresa.
--   * `CustomersComplete`, `CustomersWithFiles`, `CustomersWithRetentions`,
--     `PackageDetails` y las de payroll/legal necesitan que sus tablas base
--     tengan `company_id`: hoy `Customer`, `CustomerFiles`, `Packages`,
--     `PackageProducts` y `payroll_details` NO lo tienen. Van en la 028.
--   * `libro_diario_honduras` DIVIDE ENTRE 100 (`je.amount / 100.0`). NO se
--     assume que sea un bug: `JournalEntry.amount` tiene UNIDADES MEZCLADAS
--     segun el flujo que creo la fila. `withholding-journal/route.ts:169` escribe
--     en lempiras (`round2(retencion / 100)`) y `lib/services/automated-tax.ts`
--     escribe en centavos (`amount: totalCents`). Medido: 94 de 101 amounts son
--     multiplos de 100, lo cual NO prueba centavos (los lempiras redondos tambien
--     lo son). El `/100` acierta para unas filas y falla para otras. Se deja
--     intacto: normalizar la unidad es una decision de datos, no de aislamiento.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. PRECONDICIONES
-- Sin esto, la migracion falla mas tarde y lejos de la causa: el mismo fallo
-- que produjo el 'operator does not exist: text = uuid' tras la 023.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  vfalta text;
BEGIN
  SELECT string_agg(t, ', ' ORDER BY t) INTO vfalta
  FROM unnest(ARRAY[
    'Account.company_id', 'JournalEntry.company_id', 'Transaction.company_id',
    'Invoice.company_id', 'InvoicePayment.company_id', 'Purchase.company_id',
    'Supplier.company_id', 'Transaction.location_id', 'Invoice.location_id',
    'JournalEntry.account_id', 'JournalEntry.accountId', 'JournalEntry.accountid',
    'JournalEntry.company_id'
  ]) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = split_part(t, '.', 1)
      AND a.attname = split_part(t, '.', 2)
      AND a.attnum > 0 AND NOT a.attisdropped
  );

  IF vfalta IS NOT NULL THEN
    RAISE EXCEPTION
      '027 abortada: faltan columnas requeridas: %', vfalta;
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 0b. LAS 25 VISTAS OBJETIVO EXISTEN, CON ESE NOMBRE EXACTO
--
-- Esto va ANTES de recrear nada, por el motivo que costo el primer intento:
-- `CREATE OR REPLACE VIEW InvoiceSummary` sin comillas se refiere a
-- `invoicesummary`, que no es la vista `"InvoiceSummary"` de la base. No falla
-- con "no such view" si la minuscula ya existe de un intento anterior: crea una
-- vista NUEVA y deja la real sin `company_id`, y el fallo solo aparece al final,
-- lejos de la causa. Aqui se comprueba el nombre exacto con `format('%I')`.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  vistas text[] := ARRAY[
    'balance_general', 'balanza_comprobacion', 'libro_mayor',
    'estado_resultados', 'resumen_contable', 'libro_diario',
    'libro_diario_honduras', 'v_transacciones_cierre', 'libro_ventas',
    'libro_compras', 'cuentas_por_cobrar', 'cuentas_por_pagar',
    'InvoiceSummary', 'declaracion_mensual', 'resumen_isv', 'top_clientes',
    'purchase_book_sar', 'accounts_payable_pending', 'flujo_efectivo_mensual',
    'vista_resumen_cuentas', 'inventario_valorizado', 'inventory_stock_alert',
    'vista_estado_resultados_detallado', 'vista_resumen_estado_resultados',
    'vista_comparativo_mensual'
  ];
  vfalta text;
  vduplicada text;
BEGIN
  SELECT string_agg(v, ', ' ORDER BY v) INTO vfalta
  FROM unnest(vistas) AS v
  WHERE to_regclass(format('public.%I', v)) IS NULL;

  IF vfalta IS NOT NULL THEN
    RAISE EXCEPTION
      '027 abortada: no existe(n) la(s) vista(s): %. Se reviso el nombre exacto,'
      ' incluidas las que llevan mayuscula, que en SQL deben ir comilladas.', vfalta;
  END IF;

  -- Limpieza del intento fallido: si quedo una `invoicesummary` en minusculas,
  -- es una copia basura creada por el nombre sin comillar. La real es
  -- "InvoiceSummary" (comillada) y ya se ha comprobado que existe.
  IF to_regclass('public.invoicesummary') IS NOT NULL THEN
    vduplicada := pg_get_viewdef(to_regclass('public.invoicesummary'), true);
    IF vduplicada IS NOT NULL THEN
      EXECUTE 'DROP VIEW IF EXISTS public.invoicesummary';
      RAISE NOTICE
        'Eliminada la vista duplicada public.invoicesummary (minuscula), creada por';
      RAISE NOTICE 'el intento anterior que no comillo "InvoiceSummary". La real,';
      RAISE NOTICE '"InvoiceSummary", se conserva.';
    END IF;
  END IF;
END $$;


-- =============================================================================
-- 1. ESTADO FINANCIERO
-- El agujero mas grave: el JOIN a JournalEntry no filtraba nada.
-- El parche es `AND je.company_id = a.company_id` en el ON, NO en el WHERE:
-- en un LEFT JOIN, un filtro en el WHERE convertiria el LEFT en INNER y
-- dejaria fuera las cuentas sin movimientos, rompiendo el reporte.
-- El `OR` de las dos convenciones de columna SE MANTIENE: la fila puede tener
-- una u otra poblada, y borrarlo haria desaparecer asientos que hoy si se ven.
-- La tercera convencion (`accountid`) se avisa con NOTICE al final.
-- =============================================================================

CREATE OR REPLACE VIEW balance_general AS
SELECT a.id,
    a.code,
    a.name,
    a.type,
    a.tenant_id,
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
  GROUP BY a.id, a.code, a.name, a.type, a.tenant_id, a.company_id;


CREATE OR REPLACE VIEW balanza_comprobacion AS
SELECT a.id,
    a.code,
    a.name,
    a.type,
    a.tenant_id,
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
  GROUP BY a.id, a.code, a.name, a.type, a.tenant_id, a.company_id
  ORDER BY a.code;


CREATE OR REPLACE VIEW libro_mayor AS
SELECT a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.type AS account_type,
    a.tenant_id,
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
  GROUP BY a.id, a.code, a.name, a.type, a.tenant_id, a.company_id
  ORDER BY a.code;


CREATE OR REPLACE VIEW estado_resultados AS
SELECT a.id,
    a.code,
    a.name,
    a.type,
    a.tenant_id,
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
  GROUP BY a.id, a.code, a.name, a.type, a.tenant_id, a.company_id;


-- `resumen_contable` lleva el filtro DENTRO del subquery correlacionado, no en
-- el FROM: el `sum()` es un subquery por cuenta, y sin el `AND` cada cuenta
-- sumaba los asientos de las demas empresas.
CREATE OR REPLACE VIEW resumen_contable AS
SELECT tenant_id,
    sum(
        CASE
            WHEN type = 'ASSET'::text THEN COALESCE(( SELECT sum(
                    CASE
                        WHEN je.type = 'DEBIT'::text THEN je.amount
                        WHEN je.type = 'CREDIT'::text THEN - je.amount
                        ELSE 0::bigint
                    END) AS sum
               FROM "JournalEntry" je
              WHERE (je.account_id = a.id OR je."accountId" = a.id)
                AND je.company_id = a.company_id), 0::numeric)
            ELSE 0::numeric
        END) AS total_activos,
    sum(
        CASE
            WHEN type = 'LIABILITY'::text THEN COALESCE(( SELECT sum(
                    CASE
                        WHEN je.type = 'DEBIT'::text THEN je.amount
                        WHEN je.type = 'CREDIT'::text THEN - je.amount
                        ELSE 0::bigint
                    END) AS sum
               FROM "JournalEntry" je
              WHERE (je.account_id = a.id OR je."accountId" = a.id)
                AND je.company_id = a.company_id), 0::numeric)
            ELSE 0::numeric
        END) AS total_pasivos,
    sum(
        CASE
            WHEN type = 'EQUITY'::text THEN COALESCE(( SELECT sum(
                    CASE
                        WHEN je.type = 'DEBIT'::text THEN je.amount
                        WHEN je.type = 'CREDIT'::text THEN - je.amount
                        ELSE 0::bigint
                    END) AS sum
               FROM "JournalEntry" je
              WHERE (je.account_id = a.id OR je."accountId" = a.id)
                AND je.company_id = a.company_id), 0::numeric)
            ELSE 0::numeric
        END) AS total_patrimonio,
    sum(
        CASE
            WHEN type = 'REVENUE'::text THEN COALESCE(( SELECT sum(
                    CASE
                        WHEN je.type = 'CREDIT'::text THEN je.amount
                        WHEN je.type = 'DEBIT'::text THEN - je.amount
                        ELSE 0::bigint
                    END) AS sum
               FROM "JournalEntry" je
              WHERE (je.account_id = a.id OR je."accountId" = a.id)
                AND je.company_id = a.company_id), 0::numeric)
            ELSE 0::numeric
        END) AS total_ingresos,
    sum(
        CASE
            WHEN type = 'EXPENSE'::text THEN COALESCE(( SELECT sum(
                    CASE
                        WHEN je.type = 'DEBIT'::text THEN je.amount
                        WHEN je.type = 'CREDIT'::text THEN - je.amount
                        ELSE 0::bigint
                    END) AS sum
               FROM "JournalEntry" je
              WHERE (je.account_id = a.id OR je."accountId" = a.id)
                AND je.company_id = a.company_id), 0::numeric)
            ELSE 0::numeric
        END) AS total_gastos,
    company_id
   FROM "Account" a
  WHERE is_active = true
  GROUP BY tenant_id, company_id;


-- =============================================================================
-- 2. LIBROS Y TRANSACCIONES
-- =============================================================================

CREATE OR REPLACE VIEW libro_diario AS
SELECT t.id AS transaction_id,
    t.date,
    t.description,
    t.voucher_type,
    t.voucher_number,
    t.reference,
    t.tenant_id,
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


CREATE OR REPLACE VIEW libro_diario_honduras AS
SELECT t.id AS transaction_id,
    t."tenantId",
    t.date AS fecha,
    t."voucherType" AS tipo_comprobante,
    t."voucherNumber" AS numero_comprobante,
    t.description AS descripcion_general,
    a.code AS codigo_cuenta,
    a.name AS nombre_cuenta,
        CASE
            WHEN je.amount > 0 THEN je.amount::numeric / 100.0
            ELSE 0::numeric
        END AS debe,
        CASE
            WHEN je.amount < 0 THEN abs(je.amount)::numeric / 100.0
            ELSE 0::numeric
        END AS haber,
    t.currency AS moneda,
    t."exchangeRate" AS tipo_cambio,
    je.description AS descripcion_asiento,
    t.company_id AS company_id,
    t.location_id AS location_id
   FROM "Transaction" t
     JOIN "JournalEntry" je
       ON t.id = je."transactionId"
      AND je.company_id = t.company_id
     JOIN "Account" a
       ON je."accountId" = a.id
      AND a.company_id = t.company_id
  ORDER BY t.date DESC, t."voucherNumber" DESC, a.code;


-- Las TRES ramas del UNION.ALL necesitan el filtro: las tres leian Transaction
-- sin company_id, y las ramas 1 y 3 unian el asiento a la cuenta sin company_id.
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
    t.tenant_id,
    t.created_at,
    t.company_id AS company_id
   FROM "Transaction" t
     LEFT JOIN "JournalEntry" je
       ON je.transactionid = t.id
      AND je.company_id = t.company_id
     LEFT JOIN "Account" a
       ON a.id = je.accountid
      AND a.company_id = t.company_id
  WHERE t.tenant_id IS NOT NULL
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
    t.tenant_id,
    t.created_at,
    t.company_id AS company_id
   FROM "Transaction" t
  WHERE t.tenant_id IS NOT NULL AND NOT (EXISTS ( SELECT 1
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
    t.tenant_id,
    t.created_at,
    t.company_id AS company_id
   FROM "Transaction" t
     LEFT JOIN "JournalEntry" je
       ON je.transactionid = t.id
      AND je.company_id = t.company_id
     LEFT JOIN "Account" a
       ON a.id = je.accountid
      AND a.company_id = t.company_id
  WHERE t.tenant_id IS NOT NULL AND je.id IS NOT NULL AND a.id IS NULL;


-- =============================================================================
-- 3. FACTURACION
-- `declaracion_mensual`, `resumen_isv` y `top_clientes` agrupaban por
-- `"tenantId"`. Como test 1 y test 2 comparten el tenant 'TEST1DS', esa
-- agrupacion las SUMABA. El group by va por company_id.
-- =============================================================================

CREATE OR REPLACE VIEW libro_ventas AS
SELECT id,
    "invoiceNumber" AS invoice_number,
    "issueDate" AS invoice_date,
    "customerName" AS customer_name,
    "customerRTN" AS customer_rtn,
    subtotal,
    tax AS tax_amount,
    total,
    status,
    "tenantId" AS tenant_id,
    cai,
    company_id,
    location_id
   FROM "Invoice" i
  WHERE "invoiceType"::text = 'CUSTOMER'::text AND status::text <> 'CANCELLED'::text
  ORDER BY "issueDate" DESC;


CREATE OR REPLACE VIEW libro_compras AS
SELECT id,
    "invoiceNumber" AS invoice_number,
    "issueDate" AS invoice_date,
    "customerName" AS supplier_name,
    "customerRTN" AS supplier_rtn,
    subtotal,
    tax AS tax_amount,
    total,
    status,
    "tenantId" AS tenant_id,
    cai,
    company_id,
    location_id
   FROM "Invoice" i
  WHERE "invoiceType"::text = 'EXPENSE'::text AND status::text <> 'CANCELLED'::text
  ORDER BY "issueDate" DESC;


CREATE OR REPLACE VIEW cuentas_por_cobrar AS
SELECT "tenantId" AS tenant_id,
    "customerName" AS client_name,
    "customerRTN" AS client_rtn,
    "invoiceNumber" AS invoice_number,
    "issueDate" AS invoice_date,
    "dueDate" AS due_date,
    total,
    status,
        CASE
            WHEN "dueDate" IS NULL THEN 'SIN_FECHA'::text
            WHEN "dueDate" >= CURRENT_DATE THEN 'VIGENTE'::text
            ELSE 'VENCIDA'::text
        END AS estado_cobro,
        CASE
            WHEN "dueDate" IS NULL THEN 0
            WHEN "dueDate" >= CURRENT_DATE THEN 0
            ELSE CURRENT_DATE - "dueDate"
        END AS dias_vencido,
    company_id
   FROM "Invoice" i
  WHERE "invoiceType"::text = 'CUSTOMER'::text AND (status::text = ANY (ARRAY['ACTIVE'::character varying, 'PENDING'::character varying, 'SENT'::character varying]::text[]))
  ORDER BY "issueDate";


CREATE OR REPLACE VIEW cuentas_por_pagar AS
SELECT "tenantId" AS tenant_id,
    "customerName" AS supplier_name,
    "customerRTN" AS supplier_rtn,
    "invoiceNumber" AS invoice_number,
    "issueDate" AS invoice_date,
    "dueDate" AS due_date,
    total,
    status,
        CASE
            WHEN "dueDate" IS NULL THEN 'SIN_FECHA'::text
            WHEN "dueDate" >= CURRENT_DATE THEN 'VIGENTE'::text
            ELSE 'VENCIDA'::text
        END AS estado_pago,
        CASE
            WHEN "dueDate" IS NULL THEN 0
            WHEN "dueDate" >= CURRENT_DATE THEN 0
            ELSE CURRENT_DATE - "dueDate"
        END AS dias_vencido,
    company_id
   FROM "Invoice" i
  WHERE "invoiceType"::text = 'EXPENSE'::text AND (status::text = ANY (ARRAY['ACTIVE'::character varying, 'PENDING'::character varying, 'SENT'::character varying]::text[]))
  ORDER BY "issueDate";


-- `InvoiceSummary` TIENE MAYUSCULA Y HAY QUE COMILLARLA.
-- Sin comillas, Postgres pliega el identificador a minusculas: la sentencia
-- apunta a la vista `invoicesummary`, que no es la misma que la `"InvoiceSummary"`
-- que ya existe. El resultado es el peor de los dos: NO da error de "no existe"
-- si esa duplicada ya se creo en un intento anterior, crea una vista nueva y
-- deja la real intacta, sin `company_id`. Por eso el preflight de mas abajo
-- valida el nombre EXACTO de las 25 vistas antes de tocar nada.
CREATE OR REPLACE VIEW "InvoiceSummary" AS
SELECT i.id,
    i."tenantId",
    i."invoiceNumber",
    i."invoiceType",
    i.status,
    i."customerName",
    i."customerRTN",
    i."issueDate",
    i."dueDate",
    i.total,
    i.currency,
        CASE
            WHEN i."dueDate" < CURRENT_DATE AND i.status::text <> 'PAID'::text THEN 'OVERDUE'::character varying
            ELSE i.status
        END AS "calculatedStatus",
    COALESCE(sum(ip.amount), 0::numeric) AS "paidAmount",
    i.total - COALESCE(sum(ip.amount), 0::numeric) AS "balanceDue",
    i."createdAt",
    i."updatedAt",
    i.company_id AS company_id
   FROM "Invoice" i
     LEFT JOIN "InvoicePayment" ip
       ON i.id = ip."invoiceId"
      AND ip.company_id = i.company_id
  GROUP BY i.id, i."tenantId", i."invoiceNumber", i."invoiceType", i.status, i."customerName", i."customerRTN", i."issueDate", i."dueDate", i.total, i.currency, i."createdAt", i."updatedAt", i.company_id;


CREATE OR REPLACE VIEW declaracion_mensual AS
SELECT "tenantId" AS tenant_id,
    date_trunc('month'::text, "issueDate"::timestamp with time zone) AS mes,
    sum(
        CASE
            WHEN "invoiceType"::text = 'CUSTOMER'::text THEN subtotal
            ELSE 0::numeric
        END) AS ventas_base,
    sum(
        CASE
            WHEN "invoiceType"::text = 'CUSTOMER'::text THEN tax
            ELSE 0::numeric
        END) AS ventas_isv,
    sum(
        CASE
            WHEN "invoiceType"::text = 'CUSTOMER'::text THEN total
            ELSE 0::numeric
        END) AS ventas_total,
    count(
        CASE
            WHEN "invoiceType"::text = 'CUSTOMER'::text THEN 1
            ELSE NULL::integer
        END) AS num_ventas,
    sum(
        CASE
            WHEN "invoiceType"::text = 'EXPENSE'::text THEN subtotal
            ELSE 0::numeric
        END) AS compras_base,
    sum(
        CASE
            WHEN "invoiceType"::text = 'EXPENSE'::text THEN tax
            ELSE 0::numeric
        END) AS compras_isv,
    sum(
        CASE
            WHEN "invoiceType"::text = 'EXPENSE'::text THEN total
            ELSE 0::numeric
        END) AS compras_total,
    count(
        CASE
            WHEN "invoiceType"::text = 'EXPENSE'::text THEN 1
            ELSE NULL::integer
        END) AS num_compras,
    sum(
        CASE
            WHEN "invoiceType"::text = 'CUSTOMER'::text THEN tax
            ELSE 0::numeric
        END) - sum(
        CASE
            WHEN "invoiceType"::text = 'EXPENSE'::text THEN tax
            ELSE 0::numeric
        END) AS isv_a_pagar,
    company_id
   FROM "Invoice" i
  WHERE status::text <> 'CANCELLED'::text
  GROUP BY "tenantId", company_id, (date_trunc('month'::text, "issueDate"::timestamp with time zone))
  ORDER BY (date_trunc('month'::text, "issueDate"::timestamp with time zone)) DESC;


CREATE OR REPLACE VIEW resumen_isv AS
SELECT "tenantId" AS tenant_id,
    date_trunc('month'::text, "issueDate"::timestamp with time zone) AS mes,
    sum(
        CASE
            WHEN "taxRate" = 15::numeric THEN subtotal
            ELSE 0::numeric
        END) AS base_gravada_15,
    sum(
        CASE
            WHEN "taxRate" = 15::numeric THEN tax
            ELSE 0::numeric
        END) AS isv_15,
    sum(
        CASE
            WHEN "taxRate" = 18::numeric THEN subtotal
            ELSE 0::numeric
        END) AS base_gravada_18,
    sum(
        CASE
            WHEN "taxRate" = 18::numeric THEN tax
            ELSE 0::numeric
        END) AS isv_18,
    sum(subtotal) AS base_total,
    sum(tax) AS isv_total,
    count(*) AS facturas,
    company_id
   FROM "Invoice" i
  WHERE status::text <> 'CANCELLED'::text
  GROUP BY "tenantId", company_id, (date_trunc('month'::text, "issueDate"::timestamp with time zone))
  ORDER BY (date_trunc('month'::text, "issueDate"::timestamp with time zone)) DESC;


CREATE OR REPLACE VIEW top_clientes AS
SELECT "tenantId" AS tenant_id,
    "customerName" AS client_name,
    "customerRTN" AS client_rtn,
    "customerEmail" AS client_email,
    count(*) AS num_facturas,
    sum(subtotal) AS total_base,
    sum(tax) AS total_isv,
    sum(total) AS total_ventas,
    min("issueDate") AS primera_venta,
    max("issueDate") AS ultima_venta,
    company_id
   FROM "Invoice" i
  WHERE "invoiceType"::text = 'CUSTOMER'::text AND status::text <> 'CANCELLED'::text
  GROUP BY "tenantId", company_id, "customerName", "customerRTN", "customerEmail"
  ORDER BY (sum(total)) DESC;


-- =============================================================================
-- 4. COMPRAS Y FLUJO DE EFECTIVO
-- =============================================================================

CREATE OR REPLACE VIEW purchase_book_sar AS
SELECT p.id,
    p.invoice_date,
    p.invoice_number,
    s.rtn AS supplier_rtn,
    s.name AS supplier_name,
    p.cai,
    p.subtotal AS net_value,
    p.tax_amount AS tax_value,
    p.total AS total_value,
    p.purchase_type,
    p.expense_category,
    p.tenant_id,
    p.company_id AS company_id
   FROM "Purchase" p
     JOIN "Supplier" s
       ON s.id = p.supplier_id
      AND s.company_id = p.company_id
  WHERE p.status::text <> 'CANCELLED'::text
  ORDER BY p.invoice_date DESC;


CREATE OR REPLACE VIEW accounts_payable_pending AS
SELECT p.id AS purchase_id,
    p.invoice_number,
    p.invoice_date,
    p.due_date,
    p.total,
    p.amount_paid,
    p.balance_due,
    p.status,
    s.id AS supplier_id,
    s.name AS supplier_name,
    s.rtn AS supplier_rtn,
    p.tenant_id,
        CASE
            WHEN p.due_date < CURRENT_DATE THEN 'OVERDUE'::text
            WHEN p.due_date <= (CURRENT_DATE + '7 days'::interval) THEN 'DUE_SOON'::text
            ELSE 'NORMAL'::text
        END AS urgency,
    p.company_id AS company_id
   FROM "Purchase" p
     JOIN "Supplier" s
       ON s.id = p.supplier_id
      AND s.company_id = p.company_id
  WHERE p.is_credit = true AND (p.status::text = ANY (ARRAY['PENDING'::character varying::text, 'PARTIAL'::character varying::text]));


-- `flujo_efectivo_mensual` cambia su GRANO: pasa a agrupar por company_id Y
-- location_id. Sin location_id la ruta no puede filtrar por sede, y el
-- Empresario veria el flujo de todas sus sedes al elegir una sola.
-- NULL sigue significando "a nivel de empresa" y entra en la consolidada
-- (ver AGENTS.md seccion 1b): forma su propio grupo, no se pierde.
CREATE OR REPLACE VIEW flujo_efectivo_mensual AS
SELECT tenant_id,
    date_trunc('month'::text, date) AS mes,
    sum(
        CASE
            WHEN type = 'INGRESO'::text OR voucher_type = 'INGRESO'::text THEN total_amount
            ELSE 0::bigint
        END) AS ingresos,
    sum(
        CASE
            WHEN type = 'EGRESO'::text OR voucher_type = 'EGRESO'::text THEN abs(total_amount)
            ELSE 0::bigint
        END) AS egresos,
    sum(
        CASE
            WHEN type = 'INGRESO'::text OR voucher_type = 'INGRESO'::text THEN total_amount
            ELSE 0::bigint
        END) - sum(
        CASE
            WHEN type = 'EGRESO'::text OR voucher_type = 'EGRESO'::text THEN abs(total_amount)
            ELSE 0::bigint
        END) AS flujo_neto,
    company_id,
    location_id
   FROM "Transaction" t
  GROUP BY tenant_id, company_id, location_id, (date_trunc('month'::text, date))
  ORDER BY (date_trunc('month'::text, date)) DESC;


CREATE OR REPLACE VIEW vista_resumen_cuentas AS
SELECT "tenantId",
    type,
    count(*) AS total_cuentas,
    company_id
   FROM "Account" a
  GROUP BY "tenantId", type, company_id;


-- =============================================================================
-- 5. INVENTARIO
-- `product.location_id` es TEXT y apunta a `product_location` (el ESTANTE), no a
-- la sede. Por eso NO se expone como location_id: un .eq() sobre el erroneo
-- filtraria por la columna equivocada sin dar error. La sede del producto se
-- deduce por warehouse.location_id.
-- =============================================================================

CREATE OR REPLACE VIEW inventario_valorizado AS
SELECT p.id,
    p.code,
    p.name,
    p.description,
    p.category,
    p.product_type,
    p.current_stock,
    p.current_cost,
    p.unit_price,
    p.tax_rate,
    p.valuation_method,
    p.tenant_id,
    p.current_stock::numeric * p.current_cost AS valor_total,
    p.current_stock * p.unit_price AS valor_venta,
        CASE
            WHEN p.current_stock::numeric <= p.min_stock THEN 'STOCK_BAJO'::text
            WHEN p.current_stock >= p.max_stock THEN 'SOBRANTE'::text
            ELSE 'NORMAL'::text
        END AS estado_stock,
    p.company_id AS company_id
   FROM product p
  WHERE p.is_active = true
  ORDER BY p.name;


CREATE OR REPLACE VIEW inventory_stock_alert AS
SELECT p.id,
    p.tenant_id,
    p.code,
    p.name,
    p.current_stock,
    p.min_stock,
    p.max_stock,
    p.current_cost,
    p.valuation_method,
    p.product_type,
    p.lot_number,
    p.expiration_date,
    w.name AS warehouse_name,
        CASE
            WHEN p.current_stock::numeric <= p.min_stock THEN 'low_stock'::text
            WHEN p.expiration_date IS NOT NULL AND p.expiration_date <= (CURRENT_DATE + '30 days'::interval) THEN 'expiring'::text
            ELSE 'normal'::text
        END AS alert_type,
        CASE
            WHEN p.current_stock::numeric <= p.min_stock THEN 'Stock bajo'::text
            WHEN p.expiration_date IS NOT NULL AND p.expiration_date <= (CURRENT_DATE + '30 days'::interval) THEN 'Por vencer'::text
            ELSE 'OK'::text
        END AS alert_message,
    p.company_id AS company_id
   FROM product p
     LEFT JOIN warehouse w
       ON p.warehouse_id = w.id
      AND w.company_id = p.company_id
  WHERE p.is_active = true;


-- =============================================================================
-- 6. ESTADO DE RESULTADOS DETALLADO (base de las dos siguientes)
-- company_id tiene que atravesar los tres WITH, no solo el SELECT final.
-- =============================================================================

CREATE OR REPLACE VIEW vista_estado_resultados_detallado AS
WITH transacciones_periodo AS (
         SELECT t.id AS transaction_id,
            t.date,
            t.description,
            t."tenantId",
            t.company_id,
            je.id AS journal_entry_id,
            je.amount,
                CASE
                    WHEN je.amount > 0 THEN 'DEBIT'::text
                    ELSE 'CREDIT'::text
                END AS entry_type,
            a.id AS account_id,
            a.code AS account_code,
            a.name AS account_name,
            a.type AS account_type
           FROM "Transaction" t
             JOIN "JournalEntry" je
               ON t.id = je."transactionId"
              AND je.company_id = t.company_id
             JOIN "Account" a
               ON je."accountId" = a.id
              AND a.company_id = t.company_id
        ), categorizacion_cuentas AS (
         SELECT transacciones_periodo.transaction_id,
            transacciones_periodo.date,
            transacciones_periodo.description,
            transacciones_periodo."tenantId",
            transacciones_periodo.company_id,
            transacciones_periodo.journal_entry_id,
            transacciones_periodo.amount,
            transacciones_periodo.entry_type,
            transacciones_periodo.account_id,
            transacciones_periodo.account_code,
            transacciones_periodo.account_name,
            transacciones_periodo.account_type,
                CASE
                    WHEN transacciones_periodo.account_code ~~ '4%'::text THEN 'INGRESOS'::text
                    WHEN transacciones_periodo.account_code ~~ '5%'::text THEN 'COSTOS'::text
                    WHEN transacciones_periodo.account_code ~~ '61%'::text OR transacciones_periodo.account_code ~~ '62%'::text THEN 'GASTOS_ADMINISTRATIVOS'::text
                    WHEN transacciones_periodo.account_code ~~ '63%'::text THEN 'GASTOS_VENTAS'::text
                    WHEN transacciones_periodo.account_code ~~ '64%'::text OR transacciones_periodo.account_code ~~ '65%'::text THEN 'GASTOS_FINANCIEROS'::text
                    WHEN transacciones_periodo.account_code ~~ '6%'::text AND (transacciones_periodo.account_code ~~ '66%'::text OR transacciones_periodo.account_code ~~ '67%'::text OR transacciones_periodo.account_code ~~ '68%'::text OR transacciones_periodo.account_code ~~ '69%'::text) THEN 'OTROS_GASTOS'::text
                    WHEN transacciones_periodo.account_code ~~ '7%'::text THEN 'INGRESOS_NO_OPERACIONALES'::text
                    ELSE 'NO_APLICA'::text
                END AS categoria_resultados,
                CASE
                    WHEN transacciones_periodo.account_code = '6101'::text THEN 'Sueldos y Salarios'::text
                    WHEN transacciones_periodo.account_code = '6102'::text THEN 'Bonificaciones'::text
                    WHEN transacciones_periodo.account_code = '6103'::text THEN 'Vacaciones'::text
                    WHEN transacciones_periodo.account_code = '6104'::text THEN 'Indemnizaciones'::text
                    WHEN transacciones_periodo.account_code = '6105'::text THEN 'Seguridad Social'::text
                    WHEN transacciones_periodo.account_code ~~ '610%'::text THEN 'Gastos de Personal'::text
                    WHEN transacciones_periodo.account_code = '6201'::text THEN 'Gastos de Oficina'::text
                    WHEN transacciones_periodo.account_code = '6202'::text THEN 'Servicios Públicos'::text
                    WHEN transacciones_periodo.account_code = '6203'::text THEN 'Arrendamientos'::text
                    WHEN transacciones_periodo.account_code = '6204'::text THEN 'Mantenimiento'::text
                    WHEN transacciones_periodo.account_code = '6205'::text THEN 'Seguros'::text
                    WHEN transacciones_periodo.account_code = '6206'::text THEN 'Depreciaciones'::text
                    WHEN transacciones_periodo.account_code ~~ '620%'::text THEN 'Gastos Administrativos'::text
                    WHEN transacciones_periodo.account_code = '6301'::text THEN 'Publicidad'::text
                    WHEN transacciones_periodo.account_code = '6302'::text THEN 'Comisiones Vendedores'::text
                    WHEN transacciones_periodo.account_code = '6303'::text THEN 'Transporte Mercancía'::text
                    WHEN transacciones_periodo.account_code ~~ '630%'::text THEN 'Gastos de Ventas'::text
                    WHEN transacciones_periodo.account_code = '6401'::text THEN 'Intereses Bancarios'::text
                    WHEN transacciones_periodo.account_code = '6402'::text THEN 'Comisiones Bancarias'::text
                    WHEN transacciones_periodo.account_code = '6403'::text THEN 'Diferencia Cambiaria'::text
                    WHEN transacciones_periodo.account_code = '6404'::text THEN 'Gastos de Financiamiento'::text
                    WHEN transacciones_periodo.account_code ~~ '640%'::text THEN 'Gastos Financieros'::text
                    ELSE 'Otros'::text
                END AS subcategoria
           FROM transacciones_periodo
        )
 SELECT date,
    "tenantId",
    transaction_id,
    description,
    account_code,
    account_name,
    categoria_resultados,
    subcategoria,
        CASE
            WHEN categoria_resultados = 'INGRESOS'::text THEN abs(amount)
            WHEN categoria_resultados = 'INGRESOS_NO_OPERACIONALES'::text THEN abs(amount)
            ELSE amount
        END AS monto_reporte,
        CASE
            WHEN categoria_resultados = ANY (ARRAY['INGRESOS'::text, 'INGRESOS_NO_OPERACIONALES'::text]) THEN 'POSITIVO'::text
            WHEN categoria_resultados = ANY (ARRAY['COSTOS'::text, 'GASTOS_ADMINISTRATIVOS'::text, 'GASTOS_VENTAS'::text, 'GASTOS_FINANCIEROS'::text, 'OTROS_GASTOS'::text]) THEN 'NEGATIVO'::text
            ELSE 'NEUTRO'::text
        END AS naturaleza,
    EXTRACT(year FROM date) AS anio,
    EXTRACT(month FROM date) AS mes,
    EXTRACT(quarter FROM date) AS trimestre,
    company_id
   FROM categorizacion_cuentas
  WHERE categoria_resultados <> 'NO_APLICA'::text
  ORDER BY date DESC, account_code;


CREATE OR REPLACE VIEW vista_resumen_estado_resultados AS
WITH datos_categorizados AS (
         SELECT vista_estado_resultados_detallado.date,
            vista_estado_resultados_detallado."tenantId",
            vista_estado_resultados_detallado.company_id,
            vista_estado_resultados_detallado.transaction_id,
            vista_estado_resultados_detallado.description,
            vista_estado_resultados_detallado.account_code,
            vista_estado_resultados_detallado.account_name,
            vista_estado_resultados_detallado.categoria_resultados,
            vista_estado_resultados_detallado.subcategoria,
            vista_estado_resultados_detallado.monto_reporte,
            vista_estado_resultados_detallado.naturaleza,
            vista_estado_resultados_detallado.anio,
            vista_estado_resultados_detallado.mes,
            vista_estado_resultados_detallado.trimestre
           FROM vista_estado_resultados_detallado
        )
 SELECT "tenantId",
    anio,
    mes,
    categoria_resultados,
    subcategoria,
    count(*) AS cantidad_transacciones,
    sum(monto_reporte) AS total_monto,
    sum(monto_reporte) / NULLIF(( SELECT sum(d2.monto_reporte) AS sum
           FROM datos_categorizados d2
          WHERE d2."tenantId" = d."tenantId" AND d2.company_id = d.company_id AND d2.anio = d.anio AND d2.mes = d.mes AND d2.categoria_resultados = 'INGRESOS'::text), 0::numeric) * 100::numeric AS porcentaje_ventas,
    company_id
   FROM datos_categorizados d
  GROUP BY "tenantId", company_id, anio, mes, categoria_resultados, subcategoria
  ORDER BY "tenantId", anio DESC, mes DESC, (
        CASE categoria_resultados
            WHEN 'INGRESOS'::text THEN 1
            WHEN 'COSTOS'::text THEN 2
            WHEN 'GASTOS_ADMINISTRATIVOS'::text THEN 3
            WHEN 'GASTOS_VENTAS'::text THEN 4
            WHEN 'GASTOS_FINANCIEROS'::text THEN 5
            WHEN 'OTROS_GASTOS'::text THEN 6
            WHEN 'INGRESOS_NO_OPERACIONALES'::text THEN 7
            ELSE 8
        END);


CREATE OR REPLACE VIEW vista_comparativo_mensual AS
WITH datos_agrupados AS (
         SELECT vista_estado_resultados_detallado."tenantId",
            vista_estado_resultados_detallado.company_id,
            vista_estado_resultados_detallado.anio,
            vista_estado_resultados_detallado.mes,
            vista_estado_resultados_detallado.categoria_resultados,
            sum(vista_estado_resultados_detallado.monto_reporte) AS total
           FROM vista_estado_resultados_detallado
          GROUP BY vista_estado_resultados_detallado."tenantId", vista_estado_resultados_detallado.company_id, vista_estado_resultados_detallado.anio, vista_estado_resultados_detallado.mes, vista_estado_resultados_detallado.categoria_resultados
        ), utilidad_neta AS (
         SELECT datos_agrupados."tenantId",
            datos_agrupados.company_id,
            datos_agrupados.anio,
            datos_agrupados.mes,
            sum(
                CASE
                    WHEN datos_agrupados.categoria_resultados = ANY (ARRAY['INGRESOS'::text, 'INGRESOS_NO_OPERACIONALES'::text]) THEN datos_agrupados.total
                    WHEN datos_agrupados.categoria_resultados = ANY (ARRAY['COSTOS'::text, 'GASTOS_ADMINISTRATIVOS'::text, 'GASTOS_VENTAS'::text, 'GASTOS_FINANCIEROS'::text, 'OTROS_GASTOS'::text]) THEN - datos_agrupados.total
                    ELSE 0::numeric
                END) AS utilidad_antes_impuestos,
            sum(
                CASE
                    WHEN datos_agrupados.categoria_resultados = ANY (ARRAY['INGRESOS'::text, 'INGRESOS_NO_OPERACIONALES'::text]) THEN datos_agrupados.total
                    WHEN datos_agrupados.categoria_resultados = ANY (ARRAY['COSTOS'::text, 'GASTOS_ADMINISTRATIVOS'::text, 'GASTOS_VENTAS'::text, 'GASTOS_FINANCIEROS'::text, 'OTROS_GASTOS'::text]) THEN - datos_agrupados.total
                    ELSE 0::numeric
                END) * 0.25 AS isr_provision,
            sum(
                CASE
                    WHEN datos_agrupados.categoria_resultados = ANY (ARRAY['INGRESOS'::text, 'INGRESOS_NO_OPERACIONALES'::text]) THEN datos_agrupados.total
                    WHEN datos_agrupados.categoria_resultados = ANY (ARRAY['COSTOS'::text, 'GASTOS_ADMINISTRATIVOS'::text, 'GASTOS_VENTAS'::text, 'GASTOS_FINANCIEROS'::text, 'OTROS_GASTOS'::text]) THEN - datos_agrupados.total
                    ELSE 0::numeric
                END) * 0.75 AS utilidad_neta
           FROM datos_agrupados
          GROUP BY datos_agrupados."tenantId", datos_agrupados.company_id, datos_agrupados.anio, datos_agrupados.mes
        )
 SELECT d."tenantId",
    d.anio,
    d.mes,
    d.categoria_resultados,
    d.total,
    u.utilidad_antes_impuestos,
    u.isr_provision,
    u.utilidad_neta,
    lag(d.total) OVER (PARTITION BY d."tenantId", d.company_id, d.categoria_resultados ORDER BY d.anio, d.mes) AS mes_anterior,
        CASE
            WHEN lag(d.total) OVER (PARTITION BY d."tenantId", d.company_id, d.categoria_resultados ORDER BY d.anio, d.mes) IS NOT NULL THEN (d.total - lag(d.total) OVER (PARTITION BY d."tenantId", d.company_id, d.categoria_resultados ORDER BY d.anio, d.mes)) / NULLIF(lag(d.total) OVER (PARTITION BY d."tenantId", d.company_id, d.categoria_resultados ORDER BY d.anio, d.mes), 0::numeric) * 100::numeric
            ELSE NULL::numeric
        END AS variacion_porcentual,
    d.company_id
   FROM datos_agrupados d
     LEFT JOIN utilidad_neta u
       ON d."tenantId" = u."tenantId" AND d.company_id = u.company_id AND d.anio = u.anio AND d.mes = u.mes
  ORDER BY d."tenantId", d.anio DESC, d.mes DESC;


-- =============================================================================
-- 7. AVISOS
-- =============================================================================

DO $$
DECLARE
  v_tercera_convencion bigint;
  v_cuentas_huerfanas bigint;
  v_sin_company text;
BEGIN
  -- Las vistas ya exponen company_id, pero una ruta que no filtre seguira
  -- viendo todas las empresas. Se comprueba que al menos la columna exista, y
  -- se NOMBRA la que falle: decir solo la cantidad obliga a ir a buscarla.
  WITH objetivo(vista) AS (VALUES
    ('balance_general'), ('balanza_comprobacion'), ('libro_mayor'),
    ('estado_resultados'), ('resumen_contable'), ('libro_diario'),
    ('libro_diario_honduras'), ('v_transacciones_cierre'),
    ('libro_ventas'), ('libro_compras'), ('cuentas_por_cobrar'),
    ('cuentas_por_pagar'), ('InvoiceSummary'), ('declaracion_mensual'),
    ('resumen_isv'), ('top_clientes'), ('purchase_book_sar'),
    ('accounts_payable_pending'), ('flujo_efectivo_mensual'),
    ('vista_resumen_cuentas'), ('inventario_valorizado'),
    ('inventory_stock_alert'), ('vista_estado_resultados_detallado'),
    ('vista_resumen_estado_resultados'), ('vista_comparativo_mensual')
  )
  SELECT string_agg(o.vista, ', ' ORDER BY o.vista) INTO v_sin_company
  FROM objetivo o
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = o.vista
      AND a.attname = 'company_id' AND a.attnum > 0 AND NOT a.attisdropped
  );

  IF v_sin_company IS NOT NULL THEN
    RAISE EXCEPTION
      '027 incompleta: estas vistas NO exponen company_id: % . '
      'Si es una vista con mayuscula, el CREATE OR REPLACE no la comillo y se '
      'modifico una copia en minuscula en vez de la real.', v_sin_company;
  END IF;

  -- JournalEntry tiene TRES convenciones de account: accountId, account_id y
  -- accountid. Las vistas siguen mirando dos (las dos primeras). Los asientos que
  -- solo tengan `accountid` poblado NO salen en balance_general/libro_mayor/
  -- balanza_comprobacion/estado_resultados. NO se amplia el ON aqui a proposito:
  -- cambiarlo alteraria los saldos que hoy ve el usuario, y eso es una decision
  -- de negocio, no una correction de aislamiento.
  SELECT count(*) INTO v_tercera_convencion
  FROM "JournalEntry" je
  WHERE je.accountid IS NOT NULL
    AND je.account_id IS NULL
    AND je."accountId" IS NULL;
  IF v_tercera_convencion > 0 THEN
    RAISE NOTICE
      'ATENCION: % JournalEntry tienen(accountid) y NO (account_id/accountId): NO aparecen en balance_general, libro_mayor, balanza_comprobacion ni estado_resultados. Revisar con el usuario antes de tocar el ON.',
      v_tercera_convencion;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '027 aplicada. Vistas contables aisladas por company_id.';
  RAISE NOTICE '';
  RAISE NOTICE 'LA RUTA SIGUE SIENDO LA QUE FILTRA: estas vistas exponen company_id,';
  RAISE NOTICE 'pero el service role salta el RLS. Sin .eq(''company_id'', empresa.companyId)';
  RAISE NOTICE 'en la ruta, el reporte sigue mostrando todas las empresas.';
  RAISE NOTICE '';
  RAISE NOTICE 'SIN AISLAR (requieren otra migracion):';
  RAISE NOTICE '  - libro_diario_integrado, libro_egresos, libro_ingresos,';
  RAISE NOTICE '    resumen_ingresos_egresos: son SELECT * FROM una_funcion().';
  RAISE NOTICE '    Hay que aislar el CUERPO de la funcion, no la vista.';
  RAISE NOTICE '  - vista_resumen_produccion: itr_produccion no tiene company_id';
  RAISE NOTICE '    ni columna de tenant. No hay de donde deducir la empresa.';
  RAISE NOTICE '  - CustomersComplete, CustomersWithFiles, CustomersWithRetentions,';
  RAISE NOTICE '    PackageDetails: falta company_id en Customer, CustomerFiles,';
  RAISE NOTICE '    Packages y PackageProducts (van en la 028).';
  RAISE NOTICE '  - vistas de payroll/legal: payroll_details y';
  RAISE NOTICE '    legal_revisiones_historial no tienen company_id (028).';
  RAISE NOTICE '';
  RAISE NOTICE 'MONTO /100, SIN RESOLVER (no tocar todavia):';
  RAISE NOTICE 'libro_diario_honduras divide je.amount / 100.0.';
  RAISE NOTICE 'JournalEntry.amount tiene unidades mezcladas: withholding-journal';
  RAISE NOTICE 'escribe en lempiras y lib/services/automated-tax.ts en centavos.';
  RAISE NOTICE 'El /100 acierta para unas filas y falla para otras.';
  RAISE NOTICE 'Hay que normalizar la unidad antes de cambiar el divisor.';
  RAISE NOTICE '';

  SELECT count(*) INTO v_cuentas_huerfanas
  FROM "Account" WHERE company_id IS NULL;
  IF v_cuentas_huerfanas > 0 THEN
    RAISE NOTICE 'Las % cuentas sin company_id (tenants tenant_001 / default-tenant,', v_cuentas_huerfanas;
    RAISE NOTICE 'que no existen en companies) saldran con 0 en vez de traer asientos';
    RAISE NOTICE 'ajenos. Siguen sin empresa: hay que borrarlas o atribuirlas a mano.';
  END IF;
  RAISE NOTICE '';
END $$;

COMMIT;
