-- ============================================================
-- CONTAB - PERIOD LOCKS TABLE & FUNCTIONS
-- ============================================================
-- Ejecutar en el SQL Editor de Supabase Dashboard
-- ============================================================

-- =============================================
-- 0. AUDIT LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS account_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  account_code TEXT,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  performed_by TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON account_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON account_audit_log(action);

-- =============================================
-- 1. TABLA DE PERIODOS CERRADOS
-- =============================================
DROP TABLE IF EXISTS period_locks CASCADE;
CREATE TABLE IF NOT EXISTS period_locks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  year            INTEGER NOT NULL,
  month           INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
  closed_by       TEXT,
  closed_at       TIMESTAMPTZ,
  reopened_by     TEXT,
  reopened_at     TIMESTAMPTZ,
  reopen_reason   TEXT,
  trial_balance_snapshot JSONB,
  total_debits    BIGINT DEFAULT 0,
  total_credits   BIGINT DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_period_locks_tenant ON period_locks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_period_locks_year_month ON period_locks(tenant_id, year, month);
CREATE INDEX IF NOT EXISTS idx_period_locks_status ON period_locks(tenant_id, status);

ALTER TABLE period_locks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. RLS POLICY
-- =============================================
DROP POLICY IF EXISTS period_locks_tenant_isolation ON period_locks;
DROP POLICY IF EXISTS period_locks_service_role ON period_locks;
CREATE POLICY period_locks_tenant_isolation ON period_locks
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 3. FUNCION: Validar mes para cierre
-- =============================================
DROP FUNCTION IF EXISTS validate_month_for_closing(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION validate_month_for_closing(
  p_tenant_id TEXT,
  p_year INTEGER,
  p_month INTEGER
) RETURNS TABLE (
  can_close BOOLEAN,
  reason TEXT,
  tx_count INTEGER,
  total_debits BIGINT,
  total_credits BIGINT,
  difference BIGINT,
  prev_month_closed BOOLEAN,
  has_pending BOOLEAN
) AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_prev_month INTEGER;
  v_prev_year INTEGER;
  v_prev_status TEXT;
  v_prev_month_closed BOOLEAN;
  v_pending_count INTEGER;
  v_debits BIGINT;
  v_credits BIGINT;
  v_diff BIGINT;
  v_tx_count INTEGER;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end := date_trunc('month', (make_date(p_year, p_month, 1) + interval '1 month')::date);

  SELECT COUNT(*), COALESCE(SUM(COALESCE(je.amount, 0)), 0), COALESCE(SUM(CASE WHEN je.amount > 0 THEN je.amount ELSE 0 END), 0)
  INTO v_tx_count, v_diff, v_credits
  FROM "Transaction" t
  LEFT JOIN "JournalEntry" je ON je.transactionId = t.id
  WHERE t.tenant_id = p_tenant_id
    AND t.date >= v_start AND t.date < v_end;

  v_debits := v_diff + v_credits;
  v_diff := v_debits - v_credits;

  v_prev_month := CASE WHEN p_month = 1 THEN 12 ELSE p_month - 1 END;
  v_prev_year := CASE WHEN p_month = 1 THEN p_year - 1 ELSE p_year END;
  SELECT status INTO v_prev_status
  FROM period_locks
  WHERE tenant_id = p_tenant_id AND year = v_prev_year AND month = v_prev_month;
  v_prev_month_closed := (v_prev_status = 'closed');

  SELECT COUNT(*) INTO v_pending_count
  FROM "Transaction"
  WHERE tenant_id = p_tenant_id
    AND date >= v_start AND date < v_end
    AND voucherType = 'BORRADOR';

  can_close := (v_pending_count = 0 AND v_diff = 0 AND v_prev_month_closed);
  IF NOT v_prev_month_closed THEN
    reason := 'El mes anterior debe estar cerrado primero';
  ELSIF v_pending_count > 0 THEN
    reason := 'Existen ' || v_pending_count || ' transacciones en borrador';
  ELSIF v_diff <> 0 THEN
    reason := 'Balanza no cuadrada: diferencia = ' || v_diff;
  END IF;

  tx_count := v_tx_count;
  total_debits := v_debits;
  total_credits := v_credits;
  difference := v_diff;
  has_pending := (v_pending_count > 0);

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. FUNCION: Cerrar período
-- =============================================
DROP FUNCTION IF EXISTS close_period(TEXT, INTEGER, INTEGER, TEXT, TEXT);
CREATE OR REPLACE FUNCTION close_period(
  p_tenant_id TEXT,
  p_year INTEGER,
  p_month INTEGER,
  p_closed_by TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS TABLE (success BOOLEAN, error TEXT) AS $$
DECLARE
  v_validation RECORD;
  v_tx_count INTEGER;
  v_debits BIGINT;
  v_credits BIGINT;
  v_diff BIGINT;
  v_prev_status TEXT;
  v_existing RECORD;
  v_id UUID;
  v_tb_snapshot JSONB;
BEGIN
  SELECT * INTO v_validation FROM validate_month_for_closing(p_tenant_id, p_year, p_month);
  IF NOT v_validation.can_close THEN
    success := false;
    error := v_validation.reason;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO v_existing FROM period_locks
  WHERE tenant_id = p_tenant_id AND year = p_year AND month = p_month;

  SELECT jsonb_agg(row_to_json(r)) INTO v_tb_snapshot
  FROM (
    SELECT ac.code, ac.name, ac.type,
           COALESCE(SUM(CASE WHEN je.amount > 0 THEN je.amount ELSE 0 END), 0) as debit,
           COALESCE(SUM(CASE WHEN je.amount < 0 THEN ABS(je.amount) ELSE 0 END), 0) as credit,
           COALESCE(SUM(CASE WHEN je.amount > 0 THEN je.amount ELSE 0 END) - COALESCE(SUM(CASE WHEN je.amount < 0 THEN ABS(je.amount) ELSE 0 END), 0), 0) as balance
    FROM Account ac
    LEFT JOIN "JournalEntry" je ON je.accountId = ac.id
    LEFT JOIN "Transaction" t ON t.id = je.transactionId AND t.tenant_id = p_tenant_id AND t.date >= make_date(p_year, p_month, 1) AND t.date < date_trunc('month', (make_date(p_year, p_month, 1) + interval '1 month')::date)
    WHERE ac.tenant_id = p_tenant_id
    GROUP BY ac.code, ac.name, ac.type
  ) r;

  IF v_existing IS NOT NULL THEN
    v_id := v_existing.id;
    UPDATE period_locks SET
      status = 'closed',
      closed_by = p_closed_by,
      closed_at = now(),
      notes = p_notes,
      trial_balance_snapshot = v_tb_snapshot,
      total_debits = v_validation.total_debits,
      total_credits = v_validation.total_credits,
      transaction_count = v_validation.tx_count,
      updated_at = now()
    WHERE id = v_id;
  ELSE
    INSERT INTO period_locks (id, tenant_id, year, month, status, closed_by, closed_at, notes, trial_balance_snapshot, total_debits, total_credits, transaction_count, created_at, updated_at)
    VALUES (gen_random_uuid(), p_tenant_id, p_year, p_month, 'closed', p_closed_by, now(), p_notes, v_tb_snapshot, v_validation.total_debits, v_validation.total_credits, v_validation.tx_count, now(), now());
  END IF;

  success := true;
  error := null;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. FUNCION: Reabrir período
-- =============================================
DROP FUNCTION IF EXISTS reopen_period(TEXT, INTEGER, INTEGER, TEXT);
CREATE OR REPLACE FUNCTION reopen_period(
  p_tenant_id TEXT,
  p_year INTEGER,
  p_month INTEGER,
  p_reason TEXT
) RETURNS TABLE (success BOOLEAN, error TEXT) AS $$
DECLARE
  v_existing RECORD;
  v_has_later_closed BOOLEAN;
BEGIN
  SELECT * INTO v_existing FROM period_locks
  WHERE tenant_id = p_tenant_id AND year = p_year AND month = p_month;

  IF v_existing IS NULL OR v_existing.status <> 'closed' THEN
    success := false;
    error := 'El período no está cerrado';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM period_locks
    WHERE tenant_id = p_tenant_id AND status = 'closed'
      AND (year > p_year OR (year = p_year AND month > p_month))
  ) INTO v_has_later_closed;

  IF v_has_later_closed THEN
    success := false;
    error := 'Existen períodos posteriores cerrados';
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE period_locks SET
    status = 'open',
    reopened_by = p_tenant_id,
    reopened_at = now(),
    reopen_reason = p_reason,
    updated_at = now()
  WHERE id = v_existing.id;

  success := true;
  error := null;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. FUNCION: Obtener resumen de período
-- =============================================
DROP FUNCTION IF EXISTS get_period_summary(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_period_summary(
  p_tenant_id TEXT,
  p_year INTEGER,
  p_month INTEGER
) RETURNS TABLE (
  status TEXT,
  tx_count INTEGER,
  total_debits BIGINT,
  total_credits BIGINT,
  difference BIGINT,
  is_balanced BOOLEAN,
  has_pending BOOLEAN,
  prev_month_closed BOOLEAN,
  can_close BOOLEAN,
  closed_by TEXT,
  closed_at TIMESTAMPTZ
) AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_prev_status TEXT;
  v_pending INTEGER;
  v_debits BIGINT;
  v_credits BIGINT;
  v_diff BIGINT;
  v_tx INTEGER;
  v_lock RECORD;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end := date_trunc('month', (make_date(p_year, p_month, 1) + interval '1 month')::date);

  SELECT COUNT(*), COALESCE(SUM(COALESCE(je.amount, 0)), 0),
         COALESCE(SUM(CASE WHEN je.amount > 0 THEN je.amount ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN je.amount < 0 THEN ABS(je.amount) ELSE 0 END), 0)
  INTO v_tx, v_diff, v_debits, v_credits
  FROM "Transaction" t
  LEFT JOIN "JournalEntry" je ON je.transactionId = t.id
  WHERE t.tenant_id = p_tenant_id
    AND t.date >= v_start AND t.date < v_end;

  v_diff := v_debits - v_credits;

  SELECT status INTO v_prev_status FROM period_locks
  WHERE tenant_id = p_tenant_id AND year = p_year - CASE WHEN p_month = 1 THEN 1 ELSE 0 END
    AND month = CASE WHEN p_month = 1 THEN 12 ELSE p_month - 1 END;

  SELECT COUNT(*) INTO v_pending
  FROM "Transaction"
  WHERE tenant_id = p_tenant_id AND date >= v_start AND date < v_end AND voucherType = 'BORRADOR';

  SELECT * INTO v_lock FROM period_locks
  WHERE tenant_id = p_tenant_id AND year = p_year AND month = p_month;

  status := COALESCE(v_lock.status, 'open');
  tx_count := v_tx;
  total_debits := v_debits;
  total_credits := v_credits;
  difference := v_diff;
  is_balanced := (v_diff = 0);
  has_pending := (v_pending > 0);
  prev_month_closed := (v_prev_status = 'closed');
  can_close := (v_pending = 0 AND v_diff = 0 AND v_prev_status = 'closed');
  closed_by := v_lock.closed_by;
  closed_at := v_lock.closed_at;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VISTA CONSOLIDADA: Transacciones para Cierre Mensual
-- Une Transaction + JournalEntry + Account para todos los libros
-- ============================================================
CREATE OR REPLACE VIEW v_transacciones_cierre AS
SELECT
  t.id                                    AS id_transaccion,
  t.date                                  AS fecha,
  t.description                           AS concepto,
  COALESCE(t.voucher_type, t.voucherType) AS origen,
  CASE WHEN t.voucher_type = 'BORRADOR' OR t.voucherType = 'BORRADOR'
       THEN 'BORRADOR' ELSE 'PUBLICADO' END AS estado,
  COALESCE(je.accountId, je.account_id)  AS cuenta_id,
  COALESCE(a.code, '')                   AS cuenta_codigo,
  COALESCE(a.name, '')                   AS cuenta_nombre,
  COALESCE(je.amount, 0)                AS monto,
  CASE WHEN COALESCE(je.amount, 0) > 0 THEN COALESCE(je.amount, 0) ELSE 0 END  AS debito,
  CASE WHEN COALESCE(je.amount, 0) < 0 THEN ABS(COALESCE(je.amount, 0)) ELSE 0 END AS credito,
  t.tenant_id                            AS tenant_id,
  t.created_at                           AS created_at
FROM "Transaction" t
LEFT JOIN "JournalEntry" je ON je.transactionId = t.id
LEFT JOIN "Account" a ON a.id = je.accountId
WHERE t.tenant_id IS NOT NULL

UNION ALL

-- Transacciones sin JournalEntry (pendientes de mayorizar)
SELECT
  t.id                                    AS id_transaccion,
  t.date                                  AS fecha,
  t.description                           AS concepto,
  COALESCE(t.voucher_type, t.voucherType) AS origen,
  'PENDIENTE'                            AS estado,
  NULL                                   AS cuenta_id,
  ''                                     AS cuenta_codigo,
  ''                                     AS cuenta_nombre,
  t.total_amount                         AS monto,
  CASE WHEN t.total_amount > 0 THEN t.total_amount ELSE 0 END  AS debito,
  CASE WHEN t.total_amount < 0 THEN ABS(t.total_amount) ELSE 0 END AS credito,
  t.tenant_id                            AS tenant_id,
  t.created_at                           AS created_at
FROM "Transaction" t
WHERE t.tenant_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "JournalEntry" WHERE transactionId = t.id)

UNION ALL

-- Líneas de JournalEntry sin cuenta asignada
SELECT
  t.id                                    AS id_transaccion,
  t.date                                  AS fecha,
  t.description                           AS concepto,
  COALESCE(t.voucher_type, t.voucherType) AS origen,
  CASE WHEN t.voucher_type = 'BORRADOR' OR t.voucherType = 'BORRADOR'
       THEN 'BORRADOR' ELSE 'PUBLICADO' END AS estado,
  je.id                                   AS cuenta_id,
  ''                                     AS cuenta_codigo,
  ''                                     AS cuenta_nombre,
  je.amount                               AS monto,
  CASE WHEN je.amount > 0 THEN je.amount ELSE 0 END  AS debito,
  CASE WHEN je.amount < 0 THEN ABS(je.amount) ELSE 0 END AS credito,
  t.tenant_id                            AS tenant_id,
  t.created_at                           AS created_at
FROM "Transaction" t
LEFT JOIN "JournalEntry" je ON je.transactionId = t.id
LEFT JOIN "Account" a ON a.id = je.accountId
WHERE t.tenant_id IS NOT NULL
  AND je.id IS NOT NULL
  AND a.id IS NULL;

GRANT SELECT ON v_transacciones_cierre TO service_role;
GRANT SELECT ON v_transacciones_cierre TO authenticated;

-- =============================================
-- FUNCION: Obtener resumen consolidado de período
-- =============================================
DROP FUNCTION IF EXISTS get_closing_summary(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_closing_summary(
  p_tenant_id TEXT,
  p_year INTEGER,
  p_month INTEGER
) RETURNS TABLE (
  status TEXT,
  tx_count INTEGER,
  total_debits BIGINT,
  total_credits BIGINT,
  difference BIGINT,
  is_balanced BOOLEAN,
  has_pending BOOLEAN,
  pending_count INTEGER,
  published_count INTEGER,
  closed_by TEXT,
  closed_at TIMESTAMPTZ
) AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_lock RECORD;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end := date_trunc('month', (make_date(p_year, p_month, 1) + interval '1 month')::date);

  SELECT * INTO v_lock FROM period_locks
  WHERE tenant_id = p_tenant_id AND year = p_year AND month = p_month;

  SELECT
    COUNT(*),
    COALESCE(SUM(debito), 0),
    COALESCE(SUM(credito), 0),
    COALESCE(SUM(debito), 0) - COALESCE(SUM(credito), 0)
  INTO tx_count, total_debits, total_credits, difference
  FROM v_transacciones_cierre
  WHERE tenant_id = p_tenant_id
    AND fecha >= v_start AND fecha < v_end;

  SELECT COUNT(*) INTO pending_count
  FROM v_transacciones_cierre
  WHERE tenant_id = p_tenant_id
    AND fecha >= v_start AND fecha < v_end
    AND estado = 'BORRADOR';

  SELECT COUNT(*) INTO published_count
  FROM v_transacciones_cierre
  WHERE tenant_id = p_tenant_id
    AND fecha >= v_start AND fecha < v_end
    AND (estado = 'PUBLICADO' OR estado = 'PENDIENTE');

  status := COALESCE(v_lock.status, 'open');
  is_balanced := (difference = 0);
  has_pending := (pending_count > 0);
  closed_by := v_lock.closed_by;
  closed_at := v_lock.closed_at;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


