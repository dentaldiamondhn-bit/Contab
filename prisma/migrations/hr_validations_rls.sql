-- ============================================================
-- HR Module: Unique Constraints + RLS Policies
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Deduplicate existing data BEFORE adding constraints ─────
-- Keep the oldest employee per duplicate id_number per tenant
DO $$ BEGIN
  DELETE FROM employees
  WHERE id NOT IN (
    SELECT DISTINCT ON (tenant_id, id_number) id
    FROM employees
    WHERE id_number IS NOT NULL AND id_number != ''
    ORDER BY tenant_id, id_number, created_at ASC NULLS LAST
  )
  AND id_number IS NOT NULL AND id_number != '';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Dedup id_number skipped: %', SQLERRM; END $$;

-- Deduplicate employee_code
DO $$ BEGIN
  DELETE FROM employees
  WHERE id NOT IN (
    SELECT DISTINCT ON (tenant_id, employee_code) id
    FROM employees
    WHERE employee_code IS NOT NULL AND employee_code != ''
    ORDER BY tenant_id, employee_code, created_at ASC NULLS LAST
  )
  AND employee_code IS NOT NULL AND employee_code != '';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Dedup employee_code skipped: %', SQLERRM; END $$;

-- Deduplicate email
DO $$ BEGIN
  DELETE FROM employees
  WHERE id NOT IN (
    SELECT DISTINCT ON (tenant_id, email) id
    FROM employees
    WHERE email IS NOT NULL AND email != ''
    ORDER BY tenant_id, email, created_at ASC NULLS LAST
  )
  AND email IS NOT NULL AND email != '';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Dedup email skipped: %', SQLERRM; END $$;

-- Deduplicate departments name per tenant
DO $$ BEGIN
  DELETE FROM departments
  WHERE id NOT IN (
    SELECT DISTINCT ON (tenant_id, lower(name)) id
    FROM departments
    ORDER BY tenant_id, lower(name), created_at ASC NULLS LAST
  );
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Dedup departments skipped: %', SQLERRM; END $$;

-- Deduplicate positions name per tenant
DO $$ BEGIN
  DELETE FROM positions
  WHERE id NOT IN (
    SELECT DISTINCT ON (tenant_id, lower(name)) id
    FROM positions
    ORDER BY tenant_id, lower(name), created_at ASC NULLS LAST
  );
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Dedup positions skipped: %', SQLERRM; END $$;

-- ── Unique Constraints ──────────────────────────────────────
-- Wrap each in exception block so one failure doesn't block the rest
DO $$ BEGIN ALTER TABLE departments ADD CONSTRAINT uq_departments_tenant_name UNIQUE (tenant_id, name); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE positions ADD CONSTRAINT uq_positions_tenant_name UNIQUE (tenant_id, name); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE employees ADD CONSTRAINT uq_employees_tenant_code UNIQUE (tenant_id, employee_code); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE employees ADD CONSTRAINT uq_employees_tenant_id_number UNIQUE (tenant_id, id_number); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- Email unique index (nullable-safe)
DROP INDEX IF EXISTS uq_employees_tenant_email;
CREATE UNIQUE INDEX uq_employees_tenant_email ON employees (tenant_id, email) WHERE email IS NOT NULL AND email != '';

-- Permission types: only if table exists with 'name' column
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permission_types' AND column_name = 'name') THEN
    ALTER TABLE permission_types ADD CONSTRAINT uq_permission_types_tenant_name UNIQUE (tenant_id, name);
  END IF;
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ── RLS Policies (Row Level Security) ───────────────────────
-- Helper: enable RLS + create tenant isolation + service_role policies for any table
CREATE OR REPLACE FUNCTION enable_rls_for_table(tbl text) RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_tenant_isolation', tbl);
  EXECUTE format('CREATE POLICY %I ON %I USING (tenant_id = current_setting(''app.current_tenant_id'', true)::text)', tbl || '_tenant_isolation', tbl);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_service_role_all', tbl);
  EXECUTE format('CREATE POLICY %I ON %I USING (current_setting(''role'') = ''service_role'')', tbl || '_service_role_all', tbl);
END;
$$ LANGUAGE plpgsql;

-- Apply RLS to each table only if it exists
SELECT enable_rls_for_table('employees');
SELECT enable_rls_for_table('departments');
SELECT enable_rls_for_table('positions');
SELECT enable_rls_for_table('attendance');
SELECT enable_rls_for_table('attendance_schedules');
SELECT enable_rls_for_table('attendance_holidays');
SELECT enable_rls_for_table('attendance_config');
SELECT enable_rls_for_table('payroll_config');
SELECT enable_rls_for_table('payroll_closed');
SELECT enable_rls_for_table('payroll_uploads');
SELECT enable_rls_for_table('payroll_deductions');
SELECT enable_rls_for_table('permission_types');
SELECT enable_rls_for_table('permission_used');
SELECT enable_rls_for_table('permission_requests');
SELECT enable_rls_for_table('employee_history');
SELECT enable_rls_for_table('employee_hr_documents');

-- Cleanup helper function
DROP FUNCTION enable_rls_for_table;
