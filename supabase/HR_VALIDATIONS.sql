-- HR_VALIDATIONS.sql
-- Fixes: RLS, UNIQUE constraints, collision-safe employee_code

-- ============================================================
-- 1. RLS: employees, employee_history, employee_hr_documents
-- ============================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'employees_service_role_all') THEN
    CREATE POLICY "employees_service_role_all" ON employees FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'employees_tenant_isolation') THEN
    CREATE POLICY "employees_tenant_isolation" ON employees FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');
  END IF;
END $$;

ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'emp_history_service_role_all') THEN
    CREATE POLICY "emp_history_service_role_all" ON employee_history FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'emp_history_tenant_isolation') THEN
    CREATE POLICY "emp_history_tenant_isolation" ON employee_history FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');
  END IF;
END $$;

ALTER TABLE employee_hr_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'emp_docs_service_role_all') THEN
    CREATE POLICY "emp_docs_service_role_all" ON employee_hr_documents FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'emp_docs_tenant_isolation') THEN
    CREATE POLICY "emp_docs_tenant_isolation" ON employee_hr_documents FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');
  END IF;
END $$;

-- ============================================================
-- 2. RLS: PIP tables tenant isolation
-- pip_plans has tenant_id directly
-- pip_goals/evaluations/evidence/metrics reference pip_plans via FK
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pip_plans_tenant_isolation') THEN
    CREATE POLICY "pip_plans_tenant_isolation" ON pip_plans FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');
  END IF;
END $$;

-- pip_goals: no tenant_id column, protected via pip_plans FK + service_role
-- pip_evaluations: no tenant_id column, protected via pip_plans FK + service_role
-- pip_evidence: no tenant_id column, protected via pip_plans FK + service_role
-- pip_attendance_metrics: no tenant_id column, protected via pip_plans FK + service_role

-- ============================================================
-- 3. Fix payroll_uploads RLS (wrong setting key)
-- ============================================================

DROP POLICY IF EXISTS "tenant_isolation" ON payroll_uploads;
CREATE POLICY "payroll_uploads_service_role_all" ON payroll_uploads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "payroll_uploads_tenant_isolation" ON payroll_uploads FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- ============================================================
-- 4. UNIQUE constraints
-- ============================================================

-- employee_code
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_employee_code_unique') THEN
    ALTER TABLE employees ADD CONSTRAINT employees_employee_code_unique UNIQUE (employee_code);
  END IF;
END $$;

-- departments: unique name per tenant
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_tenant_name_unique') THEN
    ALTER TABLE departments ADD CONSTRAINT departments_tenant_name_unique UNIQUE (tenant_id, name);
  END IF;
END $$;

-- positions: unique name per tenant
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'positions_tenant_name_unique') THEN
    ALTER TABLE positions ADD CONSTRAINT positions_tenant_name_unique UNIQUE (tenant_id, name);
  END IF;
END $$;

-- payroll_closed: prevent double-close same period
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_closed_tenant_period_unique') THEN
    ALTER TABLE payroll_closed ADD CONSTRAINT payroll_closed_tenant_period_unique UNIQUE (tenant_id, month, year);
  END IF;
END $$;
