-- ========================================
-- PIP (Planes de Mejoramiento) - HR Module
-- Diamond Accounting
-- ========================================

-- Tabla principal de planes PIP
CREATE TABLE IF NOT EXISTS pip_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  employee_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled', 'extended')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  original_end_date DATE,
  created_by TEXT NOT NULL,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pip_plans_tenant ON pip_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pip_plans_employee ON pip_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_pip_plans_status ON pip_plans(status);

-- Tabla de metas/objetivos del PIP
CREATE TABLE IF NOT EXISTS pip_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pip_plan_id UUID NOT NULL REFERENCES pip_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  metric TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'porcentaje',
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'met', 'not_met', 'exceeded')),
  commitments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pip_goals_plan ON pip_goals(pip_plan_id);

-- Tabla de evaluaciones periódicas
CREATE TABLE IF NOT EXISTS pip_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pip_plan_id UUID NOT NULL REFERENCES pip_plans(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES pip_goals(id) ON DELETE SET NULL,
  evaluation_date DATE NOT NULL,
  score NUMERIC CHECK (score >= 0 AND score <= 100),
  progress_pct NUMERIC CHECK (progress_pct >= 0 AND progress_pct <= 100),
  comments TEXT NOT NULL DEFAULT '',
  evaluator TEXT NOT NULL,
  attendance_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pip_evaluations_plan ON pip_evaluations(pip_plan_id);
CREATE INDEX IF NOT EXISTS idx_pip_evaluations_goal ON pip_evaluations(goal_id);

-- Tabla de evidencias/documentos del PIP
CREATE TABLE IF NOT EXISTS pip_evidence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pip_plan_id UUID NOT NULL REFERENCES pip_plans(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES pip_goals(id) ON DELETE SET NULL,
  evaluation_id UUID REFERENCES pip_evaluations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pip_evidence_plan ON pip_evidence(pip_plan_id);

-- Tabla de seguimiento de indicadores de asistencia para PIP
CREATE TABLE IF NOT EXISTS pip_attendance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pip_plan_id UUID NOT NULL REFERENCES pip_plans(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_work_days INTEGER NOT NULL DEFAULT 0,
  present_days INTEGER NOT NULL DEFAULT 0,
  absent_days INTEGER NOT NULL DEFAULT 0,
  late_days INTEGER NOT NULL DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  disability_days INTEGER DEFAULT 0,
  vacation_days INTEGER DEFAULT 0,
  absence_rate NUMERIC DEFAULT 0,
  tardiness_rate NUMERIC DEFAULT 0,
  attendance_score NUMERIC DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pip_attendance_plan ON pip_attendance_metrics(pip_plan_id);

-- RLS Policies
ALTER TABLE pip_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pip_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pip_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pip_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE pip_attendance_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on pip_plans" ON pip_plans;
CREATE POLICY "Allow all for service_role on pip_plans"
  ON pip_plans FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow all for service_role on pip_goals" ON pip_goals;
CREATE POLICY "Allow all for service_role on pip_goals"
  ON pip_goals FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow all for service_role on pip_evaluations" ON pip_evaluations;
CREATE POLICY "Allow all for service_role on pip_evaluations"
  ON pip_evaluations FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow all for service_role on pip_evidence" ON pip_evidence;
CREATE POLICY "Allow all for service_role on pip_evidence"
  ON pip_evidence FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow all for service_role on pip_attendance_metrics" ON pip_attendance_metrics;
CREATE POLICY "Allow all for service_role on pip_attendance_metrics"
  ON pip_attendance_metrics FOR ALL
  USING (auth.role() = 'service_role');
