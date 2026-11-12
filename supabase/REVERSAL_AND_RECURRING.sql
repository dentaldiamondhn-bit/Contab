-- Migración: Reversión de asientos y asientos recurrentes
-- SAFE TO RUN MULTIPLE TIMES

-- =============================================
-- 1. TABLA DE REVERSIONES
-- =============================================
CREATE TABLE IF NOT EXISTS journal_entry_reversals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  original_transaction_id UUID NOT NULL,
  reversal_transaction_id UUID,
  reason TEXT NOT NULL,
  reversed_by TEXT NOT NULL,
  reversed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reversals_tenant ON journal_entry_reversals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reversals_original ON journal_entry_reversals(original_transaction_id);

ALTER TABLE journal_entry_reversals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tenant_isolation_reversals" ON journal_entry_reversals;
  DROP POLICY IF EXISTS "service_role_all_reversals" ON journal_entry_reversals;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "tenant_isolation_reversals" ON journal_entry_reversals
  USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

CREATE POLICY "service_role_all_reversals" ON journal_entry_reversals
  FOR ALL USING (current_setting('role') = 'service_role');

-- =============================================
-- 2. TABLA DE ASIENTOS RECURRENTES
-- =============================================
CREATE TABLE IF NOT EXISTS recurring_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  voucher_type TEXT NOT NULL DEFAULT 'DIARIO',
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  next_execution DATE NOT NULL,
  last_execution DATE,
  is_active BOOLEAN DEFAULT true,
  entries JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_tenant ON recurring_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_entries(next_execution);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_entries(is_active);

ALTER TABLE recurring_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tenant_isolation_recurring" ON recurring_entries;
  DROP POLICY IF EXISTS "service_role_all_recurring" ON recurring_entries;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "tenant_isolation_recurring" ON recurring_entries
  USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

CREATE POLICY "service_role_all_recurring" ON recurring_entries
  FOR ALL USING (current_setting('role') = 'service_role');

-- =============================================
-- 3. TABLA DE EJECUCIONES DE ASIENTOS RECURRENTES
-- =============================================
CREATE TABLE IF NOT EXISTS recurring_entry_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_entry_id UUID NOT NULL REFERENCES recurring_entries(id) ON DELETE CASCADE,
  transaction_id UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_exec_recurring ON recurring_entry_executions(recurring_entry_id);

ALTER TABLE recurring_entry_executions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tenant_isolation_executions" ON recurring_entry_executions;
  DROP POLICY IF EXISTS "service_role_all_executions" ON recurring_entry_executions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "tenant_isolation_executions" ON recurring_entry_executions
  USING (recurring_entry_id IN (
    SELECT id FROM recurring_entries
    WHERE tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  ));

CREATE POLICY "service_role_all_executions" ON recurring_entry_executions
  FOR ALL USING (current_setting('role') = 'service_role');
