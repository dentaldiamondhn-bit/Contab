-- ============================================================
-- HR Module: Unique Constraints + RLS Policies
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Unique Constraints ──────────────────────────────────────
-- Departments: unique name per tenant
ALTER TABLE departments ADD CONSTRAINT uq_departments_tenant_name UNIQUE (tenant_id, name);

-- Positions: unique name per tenant
ALTER TABLE positions ADD CONSTRAINT uq_positions_tenant_name UNIQUE (tenant_id, name);

-- Employees: unique employee_code per tenant
ALTER TABLE employees ADD CONSTRAINT uq_employees_tenant_code UNIQUE (tenant_id, employee_code);

-- Employees: unique identity number per tenant
ALTER TABLE employees ADD CONSTRAINT uq_employees_tenant_id_number UNIQUE (tenant_id, id_number);

-- Employees: unique email per tenant (nullable-safe)
CREATE UNIQUE INDEX uq_employees_tenant_email ON employees (tenant_id, email) WHERE email IS NOT NULL AND email != '';

-- Permission types: unique name per tenant
ALTER TABLE permission_types ADD CONSTRAINT uq_permission_types_tenant_name UNIQUE (tenant_id, name);

-- ── RLS Policies (Row Level Security) ───────────────────────
-- Enable RLS on all HR tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_closed ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_hr_documents ENABLE ROW LEVEL SECURITY;

-- ── Employees RLS ───────────────────────────────────────────
CREATE POLICY "employees_tenant_isolation" ON employees
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "employees_service_role_all" ON employees
  USING (current_setting('role') = 'service_role');

-- ── Departments RLS ─────────────────────────────────────────
CREATE POLICY "departments_tenant_isolation" ON departments
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "departments_service_role_all" ON departments
  USING (current_setting('role') = 'service_role');

-- ── Positions RLS ───────────────────────────────────────────
CREATE POLICY "positions_tenant_isolation" ON positions
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "positions_service_role_all" ON positions
  USING (current_setting('role') = 'service_role');

-- ── Attendance RLS ──────────────────────────────────────────
CREATE POLICY "attendance_tenant_isolation" ON attendance
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "attendance_service_role_all" ON attendance
  USING (current_setting('role') = 'service_role');

-- ── Attendance Schedules RLS ────────────────────────────────
CREATE POLICY "attendance_schedules_tenant_isolation" ON attendance_schedules
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "attendance_schedules_service_role_all" ON attendance_schedules
  USING (current_setting('role') = 'service_role');

-- ── Attendance Holidays RLS ─────────────────────────────────
CREATE POLICY "attendance_holidays_tenant_isolation" ON attendance_holidays
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "attendance_holidays_service_role_all" ON attendance_holidays
  USING (current_setting('role') = 'service_role');

-- ── Attendance Config RLS ───────────────────────────────────
CREATE POLICY "attendance_config_tenant_isolation" ON attendance_config
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "attendance_config_service_role_all" ON attendance_config
  USING (current_setting('role') = 'service_role');

-- ── Payroll Config RLS ──────────────────────────────────────
CREATE POLICY "payroll_config_tenant_isolation" ON payroll_config
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "payroll_config_service_role_all" ON payroll_config
  USING (current_setting('role') = 'service_role');

-- ── Payroll Closed RLS ──────────────────────────────────────
CREATE POLICY "payroll_closed_tenant_isolation" ON payroll_closed
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "payroll_closed_service_role_all" ON payroll_closed
  USING (current_setting('role') = 'service_role');

-- ── Payroll Uploads RLS ─────────────────────────────────────
CREATE POLICY "payroll_uploads_tenant_isolation" ON payroll_uploads
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "payroll_uploads_service_role_all" ON payroll_uploads
  USING (current_setting('role') = 'service_role');

-- ── Payroll Deductions RLS ──────────────────────────────────
CREATE POLICY "payroll_deductions_tenant_isolation" ON payroll_deductions
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "payroll_deductions_service_role_all" ON payroll_deductions
  USING (current_setting('role') = 'service_role');

-- ── Permission Types RLS ────────────────────────────────────
CREATE POLICY "permission_types_tenant_isolation" ON permission_types
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "permission_types_service_role_all" ON permission_types
  USING (current_setting('role') = 'service_role');

-- ── Permission Used RLS ─────────────────────────────────────
CREATE POLICY "permission_used_tenant_isolation" ON permission_used
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "permission_used_service_role_all" ON permission_used
  USING (current_setting('role') = 'service_role');

-- ── Permission Requests RLS ─────────────────────────────────
CREATE POLICY "permission_requests_tenant_isolation" ON permission_requests
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "permission_requests_service_role_all" ON permission_requests
  USING (current_setting('role') = 'service_role');

-- ── Employee History RLS ────────────────────────────────────
CREATE POLICY "employee_history_tenant_isolation" ON employee_history
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "employee_history_service_role_all" ON employee_history
  USING (current_setting('role') = 'service_role');

-- ── Employee HR Documents RLS ───────────────────────────────
CREATE POLICY "employee_hr_documents_tenant_isolation" ON employee_hr_documents
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "employee_hr_documents_service_role_all" ON employee_hr_documents
  USING (current_setting('role') = 'service_role');
