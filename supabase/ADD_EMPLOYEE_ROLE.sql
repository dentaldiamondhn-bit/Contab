-- Add role column to employees for attendance permission hierarchy
-- gerente: can see/modify all supervisors and their teams
-- supervisor: can see/modify their direct reports
-- empleado: can only mark their own time

ALTER TABLE employees ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'empleado' CHECK (role IN ('gerente', 'supervisor', 'empleado'));

CREATE INDEX IF NOT EXISTS idx_employees_role ON employees (tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_employees_reports_to ON employees (tenant_id, reports_to);
