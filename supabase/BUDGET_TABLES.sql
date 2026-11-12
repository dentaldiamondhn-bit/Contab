-- Presupuestos y control presupuestario (Etapa 1 — Control Financiero)
-- Ejecutar en Supabase SQL Editor
-- Referencia: docs/CONTROL_FINANCIERO_REPORT.md §4 Etapa 1 (tarea 1.1)

-- Encabezado de presupuesto anual por empresa
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  period_type TEXT NOT NULL DEFAULT 'annual' CHECK (period_type IN ('annual', 'monthly')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, company_id, name, year)
);

-- Líneas del presupuesto por cuenta contable.
-- period NULL  => monto anual (se prorratea en 12 partes iguales al comparar un mes).
-- period YYYY-MM => monto específico de ese mes (tiene prioridad sobre el prorrateo).
CREATE TABLE IF NOT EXISTS budget_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES budgets (id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('ingreso', 'gasto')),
  period TEXT CHECK (period IS NULL OR period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_budgets_tenant_company ON budgets (tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_budgets_year_status ON budgets (year, status);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON budget_lines (budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_account_period ON budget_lines (account_code, period);

-- RLS: cada tenant solo ve sus presupuestos (la API usa service_role y hace bypass)
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tenant budgets" ON budgets;
CREATE POLICY "Users can view own tenant budgets" ON budgets
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

DROP POLICY IF EXISTS "Users can view own tenant budget lines" ON budget_lines;
CREATE POLICY "Users can view own tenant budget lines" ON budget_lines
  FOR ALL USING (
    budget_id IN (
      SELECT id FROM budgets
      WHERE tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')
    )
  );

COMMENT ON TABLE budgets IS 'Encabezados de presupuesto anual por empresa (Control Financiero)';
COMMENT ON TABLE budget_lines IS 'Líneas de presupuesto por cuenta contable; period NULL = monto anual prorrateable';
