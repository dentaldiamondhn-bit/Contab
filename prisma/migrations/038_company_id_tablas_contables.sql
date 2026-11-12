-- ============================================================================
-- 038 - company_id en las tablas contables que aun no lo tenian
-- ----------------------------------------------------------------------------
-- PENDIENTE DE APLICAR EN EL SQL EDITOR DE SUPABASE. No lo aplica el asistente.
--
-- Contexto: la verificacion del 1 Oct 2026 (OpenAPI de PostgREST, solo lectura)
-- sobre 97 relaciones contables dejo 64 con company_id y 33 sin. De esas 33, se
-- separaron en tres grupos. Esta migracion cubre SOLO el grupo "empresa":
--
--   INCLUDED (15 tablas; todas con 0 filas salvo payroll_vouchers = 13):
--     AccountPayable, AccountReceivable, BookClosing, Reconciliation,
--     payment_vouchers, paymentreceipt, budget_lines, payroll_vouchers,
--     employee_salary_history, employer_contributions,
--     asset_depreciation, asset_disposals, asset_documents,
--     asset_maintenance, asset_transfers
--
--   NO incluido - hijas que se aislan por su tabla padre (ya tiene company_id):
--     inventory_adjustment_item (-> inventory_adjustment),
--     inventory_transfer_item   (-> inventory_transfer),
--     journal_entry_template_lines (-> journal_entry_templates),
--     recurring_entry_executions   (-> recurring_entries),
--     payroll_detail_optional_deductions (-> payroll_details)
--
--   NO incluido - catalogos globales (filas compartidas, tenantid='default' o
--   configuracion de moneda global). Ponerles company_id y filtrar por empresa
--   las escondería:
--     Taxes (10 filas, tenantid='default'), Retentions (9 filas, tenantid='default'),
--     TaxConfig (0), ExchangeRate (0), CurrencyHistory (0; hija de Transaction)
--
-- Tipos (regla dura): company_id es text porque apunta a companies.id (text).
--
-- Backfill medido antes de escribir (1 Oct 2026):
--   payroll_vouchers = 13 filas y las 13 resuelven a Angelos
--     (7bd123d8-40fa-4383-93a4-d87e37b0ce3f) por employee_id y por payroll_detail_id.
--   El resto de tablas del grupo tiene 0 filas, asi que el backfill es no-op.
--   Nada de esto esta en prisma/schema.prisma: no crea drift.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Preflight: companies.id debe ser text
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  SELECT data_type INTO t
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'id';
  IF t IS NULL THEN
    RAISE EXCEPTION '038: no existe public.companies.id';
  END IF;
  IF t <> 'text' THEN
    RAISE EXCEPTION '038: companies.id es % (se esperaba text). Abortar.', t;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. Añadir company_id text (idempotente) + indice
-- ----------------------------------------------------------------------------
ALTER TABLE public."AccountPayable"          ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public."AccountReceivable"       ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public."BookClosing"             ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public."Reconciliation"          ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.payment_vouchers          ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.paymentreceipt            ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.budget_lines              ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.payroll_vouchers          ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.employee_salary_history   ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.employer_contributions    ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.asset_depreciation        ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.asset_disposals           ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.asset_documents           ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.asset_maintenance         ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.asset_transfers           ADD COLUMN IF NOT EXISTS company_id text;

DO $$
DECLARE
  t text;
  arr text[] := ARRAY[
    'AccountPayable','AccountReceivable','BookClosing','Reconciliation',
    'payment_vouchers','paymentreceipt','budget_lines','payroll_vouchers',
    'employee_salary_history','employer_contributions','asset_depreciation',
    'asset_disposals','asset_documents','asset_maintenance','asset_transfers'
  ];
BEGIN
  FOREACH t IN ARRAY arr LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (company_id)', 'idx_' || t || '_company_id', t);
  END LOOP;
  RAISE NOTICE '038: indices asegurados en % tablas', array_length(arr, 1);
END $$;

-- ----------------------------------------------------------------------------
-- 2. Backfill desde la tabla padre (todas menos AccountPayable/Receivable)
--    Nota: el orden importa para payroll_vouchers (employee primero, detalle
--    despues); el segundo UPDATE solo toca las que queden en NULL.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  m record;
  n int;
  total int := 0;
BEGIN
  FOR m IN
    SELECT * FROM (VALUES
      ('budget_lines',            'budget_id',         'budgets',         'id'),
      ('payment_vouchers',        'payroll_detail_id', 'payroll_details', 'id'),
      ('paymentreceipt',          'payment_link_id',   'paymentlink',     'id'),
      ('employee_salary_history', 'employee_id',       'employees',       'id'),
      ('employer_contributions',  'payroll_period_id', 'payroll_periods', 'id'),
      ('payroll_vouchers',        'employee_id',       'employees',       'id'),
      ('payroll_vouchers',        'payroll_detail_id', 'payroll_details', 'id'),
      ('asset_depreciation',      'asset_id',          'fixed_assets',    'id'),
      ('asset_disposals',         'asset_id',          'fixed_assets',    'id'),
      ('asset_documents',         'asset_id',          'fixed_assets',    'id'),
      ('asset_maintenance',       'asset_id',          'fixed_assets',    'id'),
      ('asset_transfers',         'asset_id',          'fixed_assets',    'id')
    ) AS v(ct, ck, pt, pk)
  LOOP
    EXECUTE format(
      'UPDATE public.%I c SET company_id = p.company_id FROM public.%I p WHERE c.company_id IS NULL AND p.%I = c.%I',
      m.ct, m.pt, m.pk, m.ck
    );
    GET DIAGNOSTICS n = ROW_COUNT;
    total := total + n;
    IF n > 0 THEN RAISE NOTICE '038: % <- % = % filas', m.ct, m.pt, n; END IF;
  END LOOP;
  RAISE NOTICE '038: backfill por padre total = % filas', total;
END $$;

-- AccountPayable / AccountReceivable: por su tenant, SOLO si el tenant tiene
-- una sola empresa (no se adivina en TEST1DS). Hoy tienen 0 filas.
DO $$
DECLARE
  n int;
BEGIN
  WITH unica AS (
    SELECT tenant_id, min(id) AS company_id
    FROM public.companies
    GROUP BY tenant_id
    HAVING count(*) = 1
  )
  UPDATE public."AccountPayable" a SET company_id = u.company_id
  FROM unica u
  WHERE a.company_id IS NULL AND a.tenantid = u.tenant_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '038: AccountPayable backfill = % filas', n;

  WITH unica AS (
    SELECT tenant_id, min(id) AS company_id
    FROM public.companies
    GROUP BY tenant_id
    HAVING count(*) = 1
  )
  UPDATE public."AccountReceivable" a SET company_id = u.company_id
  FROM unica u
  WHERE a.company_id IS NULL AND a.tenantid = u.tenant_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '038: AccountReceivable backfill = % filas', n;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Post-check: reporta filas y NULLs. Aborta si payroll_vouchers (la unica
--    con datos) no quedo 100% mapeada, que seria un fallo del backfill.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  nulos int;
  filas int;
  faltan int := 0;
  arr text[] := ARRAY[
    'AccountPayable','AccountReceivable','BookClosing','Reconciliation',
    'payment_vouchers','paymentreceipt','budget_lines','payroll_vouchers',
    'employee_salary_history','employer_contributions','asset_depreciation',
    'asset_disposals','asset_documents','asset_maintenance','asset_transfers'
  ];
BEGIN
  FOREACH t IN ARRAY arr LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO filas;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE company_id IS NULL', t) INTO nulos;
    RAISE NOTICE '038: % = % filas (% sin company_id)', t, filas, nulos;
    IF nulos > 0 THEN faltan := faltan + nulos; END IF;
  END LOOP;

  EXECUTE 'SELECT count(*) FROM public.payroll_vouchers WHERE company_id IS NULL' INTO nulos;
  IF nulos > 0 THEN
    RAISE EXCEPTION '038: quedaron % payroll_vouchers sin company_id; el backfill fallo, se aborta.', nulos;
  END IF;

  IF faltan = 0 THEN
    RAISE NOTICE '038: OK, 15/15 tablas sin filas huérfanas.';
  ELSE
    RAISE NOTICE '038: % filas sin company_id en total (tablas vacias o sin mapeo unico). Revisar.', faltan;
  END IF;
END $$;

COMMIT;
