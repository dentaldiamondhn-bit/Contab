-- ============================================================
-- DIAMOND ACCOUNTING - RECURSOS HUMANOS: SQL COMPLETO
-- ============================================================
-- Copiar todo y ejecutar en: Supabase Dashboard → SQL Editor → Run
-- Tenant: ANGELOH7
-- ============================================================


-- ============================================================
-- SECCIÓN 1: TABLAS DE EMPLEADOS (columnas adicionales)
-- ============================================================

-- Columnas de género y días libres
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS free_days INTEGER[] DEFAULT '{}';

-- Columnas de horario individual
ALTER TABLE employees ADD COLUMN IF NOT EXISTS schedule_entry TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS schedule_exit TEXT;

-- Migrar datos existentes de schedule_hours a entry/exit
UPDATE employees 
SET schedule_entry = SPLIT_PART(schedule_hours, ' - ', 1),
    schedule_exit = SPLIT_PART(schedule_hours, ' - ', 2)
WHERE schedule_hours LIKE '% - %' 
  AND (schedule_entry IS NULL OR schedule_entry = '');

-- Jerarquía: quién reporta a quién
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES employees(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_employees_reports_to ON employees(reports_to);
COMMENT ON COLUMN employees.reports_to IS 'ID del empleado directo al que reporta (jefe directo)';


-- ============================================================
-- SECCIÓN 2: DEPARTAMENTOS Y CARGOS
-- ============================================================

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    manager VARCHAR(255) DEFAULT '',
    parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    min_salary DECIMAL(12,2) DEFAULT 0,
    max_salary DECIMAL(12,2) DEFAULT 0,
    parent_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_tenant ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_positions_tenant ON positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_positions_department ON positions(department);

-- RLS departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departments_tenant_isolation" ON departments;
DROP POLICY IF EXISTS "departments_service_role_all" ON departments;
CREATE POLICY "departments_service_role_all" ON departments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "departments_tenant_isolation" ON departments FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- RLS positions
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "positions_tenant_isolation" ON positions;
DROP POLICY IF EXISTS "positions_service_role_all" ON positions;
CREATE POLICY "positions_service_role_all" ON positions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "positions_tenant_isolation" ON positions FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- Datos semilla ANGELOH7
INSERT INTO departments (id, tenant_id, name, description, manager, created_at)
VALUES
    (gen_random_uuid(), 'ANGELOH7', 'Administración', 'Dirección general', '', NOW()),
    (gen_random_uuid(), 'ANGELOH7', 'Contabilidad', 'Departamento contable', '', NOW()),
    (gen_random_uuid(), 'ANGELOH7', 'Recursos Humanos', 'Gestión de personal', '', NOW()),
    (gen_random_uuid(), 'ANGELOH7', 'Ventas', 'Departamento comercial', '', NOW()),
    (gen_random_uuid(), 'ANGELOH7', 'Operaciones', 'Operaciones generales', '', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO positions (id, tenant_id, name, department, description, min_salary, max_salary, created_at)
VALUES
    (gen_random_uuid(), 'ANGELOH7', 'Gerente', 'Administración', 'Gerente general', 15000, 50000, NOW()),
    (gen_random_uuid(), 'ANGELOH7', 'Contador', 'Contabilidad', 'Contador general', 10000, 25000, NOW()),
    (gen_random_uuid(), 'ANGELOH7', 'Asistente RH', 'Recursos Humanos', 'Asistente de recursos humanos', 8000, 15000, NOW()),
    (gen_random_uuid(), 'ANGELOH7', 'Vendedor', 'Ventas', 'Ejecutivo de ventas', 7000, 15000, NOW()),
    (gen_random_uuid(), 'ANGELOH7', 'Operador', 'Operaciones', 'Operador general', 6000, 12000, NOW())
ON CONFLICT DO NOTHING;


-- ============================================================
-- SECCIÓN 3: ASISTENCIA (10 tablas)
-- ============================================================

-- 3.1 Registros diarios de asistencia
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'present',
    amount DECIMAL(12,2) DEFAULT 0,
    overtime_amount DECIMAL(12,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    holiday_type VARCHAR(10),
    disability_type VARCHAR(20),
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON attendance(tenant_id, date);

-- 3.2 Feriados nacionales
CREATE TABLE IF NOT EXISTS attendance_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'libre',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, date)
);

CREATE INDEX IF NOT EXISTS idx_holidays_tenant ON attendance_holidays(tenant_id);

-- 3.3 Configuración de deducciones por asistencia
CREATE TABLE IF NOT EXISTS attendance_deduction_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL UNIQUE,
    absent_percent DECIMAL(5,2) DEFAULT 100,
    late_threshold_minutes INT DEFAULT 10,
    late_deduction_amount DECIMAL(12,2) DEFAULT 0,
    unpaid_leave_percent DECIMAL(5,2) DEFAULT 100,
    disability_percent DECIMAL(5,2) DEFAULT 0,
    overtime_rate_multiplier DECIMAL(5,2) DEFAULT 2.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.4 Horarios por empleado
CREATE TABLE IF NOT EXISTS attendance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    free_days INT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_schedules_tenant ON attendance_schedules(tenant_id);

-- RLS para asistencia
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_service_role_all" ON attendance;
DROP POLICY IF EXISTS "attendance_tenant_isolation" ON attendance;
CREATE POLICY "attendance_service_role_all" ON attendance FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "attendance_tenant_isolation" ON attendance FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

ALTER TABLE attendance_holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "holidays_service_role_all" ON attendance_holidays;
DROP POLICY IF EXISTS "holidays_tenant_isolation" ON attendance_holidays;
CREATE POLICY "holidays_service_role_all" ON attendance_holidays FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "holidays_tenant_isolation" ON attendance_holidays FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

ALTER TABLE attendance_deduction_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attd_config_service_role_all" ON attendance_deduction_config;
DROP POLICY IF EXISTS "attd_config_tenant_isolation" ON attendance_deduction_config;
CREATE POLICY "attd_config_service_role_all" ON attendance_deduction_config FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "attd_config_tenant_isolation" ON attendance_deduction_config FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

ALTER TABLE attendance_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedules_service_role_all" ON attendance_schedules;
DROP POLICY IF EXISTS "schedules_tenant_isolation" ON attendance_schedules;
CREATE POLICY "schedules_service_role_all" ON attendance_schedules FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "schedules_tenant_isolation" ON attendance_schedules FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');


-- ============================================================
-- SECCIÓN 4: NÓMINA (3 tablas)
-- ============================================================

-- 4.1 Configuración de planilla
CREATE TABLE IF NOT EXISTS payroll_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL UNIQUE,
    frequency VARCHAR(20) DEFAULT 'quincenal',
    igss_employee DECIMAL(5,2) DEFAULT 3.19,
    igss_employer DECIMAL(5,2) DEFAULT 4.12,
    ihss DECIMAL(5,2) DEFAULT 2.5,
    rap DECIMAL(5,2) DEFAULT 1.5,
    currency VARCHAR(10) DEFAULT 'HNL',
    quincenal_day1 INT DEFAULT 15,
    quincenal_day2 INT DEFAULT 30,
    aguinaldo_percent DECIMAL(5,2) DEFAULT 8.33,
    bono14_percent DECIMAL(5,2) DEFAULT 8.33,
    vacation_days INT DEFAULT 12,
    closing_month INT,
    closing_year INT,
    igss_quincena VARCHAR(10) DEFAULT 'ambas',
    ihss_quincena VARCHAR(10) DEFAULT 'ambas',
    rap_quincena VARCHAR(10) DEFAULT 'ambas',
    bonus_deadline_days_before INT DEFAULT 2,
    attendance_deadline_days_before INT DEFAULT 2,
    overtime_deadline_days_before INT DEFAULT 2,
    docs_deadline_days_before INT DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.2 Planillas cerradas (historial)
CREATE TABLE IF NOT EXISTS payroll_closed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    period VARCHAR(100) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    total_period_base DECIMAL(12,2) DEFAULT 0,
    total_base DECIMAL(12,2) DEFAULT 0,
    total_deductions DECIMAL(12,2) DEFAULT 0,
    total_igss_employer DECIMAL(12,2) DEFAULT 0,
    total_net_pay DECIMAL(12,2) DEFAULT 0,
    total_attendance_deductions DECIMAL(12,2) DEFAULT 0,
    total_attendance_incomes DECIMAL(12,2) DEFAULT 0,
    employee_count INT DEFAULT 0,
    employees JSONB DEFAULT '[]',
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_by VARCHAR(255) DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_payroll_closed_tenant ON payroll_closed(tenant_id);

-- 4.3 Deducciones individuales por empleado
CREATE TABLE IF NOT EXISTS payroll_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    deduction_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'fixed',
    value DECIMAL(12,2) DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    is_standard BOOLEAN DEFAULT false,
    payment_frequency VARCHAR(20) DEFAULT 'mensual',
    total_payments INT DEFAULT 1,
    quincena VARCHAR(10) DEFAULT 'ambas',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id, deduction_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_deductions_tenant ON payroll_deductions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_deductions_employee ON payroll_deductions(employee_id);

-- RLS para nómina
ALTER TABLE payroll_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_config_service_role_all" ON payroll_config;
DROP POLICY IF EXISTS "payroll_config_tenant_isolation" ON payroll_config;
CREATE POLICY "payroll_config_service_role_all" ON payroll_config FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "payroll_config_tenant_isolation" ON payroll_config FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

ALTER TABLE payroll_closed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_closed_service_role_all" ON payroll_closed;
DROP POLICY IF EXISTS "payroll_closed_tenant_isolation" ON payroll_closed;
CREATE POLICY "payroll_closed_service_role_all" ON payroll_closed FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "payroll_closed_tenant_isolation" ON payroll_closed FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

ALTER TABLE payroll_deductions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_deductions_service_role_all" ON payroll_deductions;
DROP POLICY IF EXISTS "payroll_deductions_tenant_isolation" ON payroll_deductions;
CREATE POLICY "payroll_deductions_service_role_all" ON payroll_deductions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "payroll_deductions_tenant_isolation" ON payroll_deductions FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');


-- ============================================================
-- SECCIÓN 5: PERMISOS Y VACACIONES (3 tablas)
-- ============================================================

-- 5.1 Tipos de permiso
CREATE TABLE IF NOT EXISTS permission_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    icon VARCHAR(50) DEFAULT 'Calendar',
    annual_days INT DEFAULT 0,
    monthly_accrual BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_types_tenant ON permission_types(tenant_id);

-- 5.2 Solicitudes de permiso
CREATE TABLE IF NOT EXISTS permission_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    type_id UUID,
    type_label VARCHAR(255) DEFAULT '',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INT DEFAULT 1,
    reason TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'pending',
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_requests_tenant ON permission_requests(tenant_id);

-- 5.3 Uso de permisos
CREATE TABLE IF NOT EXISTS permission_used (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    type_id UUID,
    annual DECIMAL(5,2) DEFAULT 0,
    monthly DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id, type_id)
);

CREATE INDEX IF NOT EXISTS idx_permission_used_tenant ON permission_used(tenant_id);

-- RLS para permisos
ALTER TABLE permission_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perm_types_service_role_all" ON permission_types;
DROP POLICY IF EXISTS "perm_types_tenant_isolation" ON permission_types;
CREATE POLICY "perm_types_service_role_all" ON permission_types FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "perm_types_tenant_isolation" ON permission_types FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

ALTER TABLE permission_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perm_requests_service_role_all" ON permission_requests;
DROP POLICY IF EXISTS "perm_requests_tenant_isolation" ON permission_requests;
CREATE POLICY "perm_requests_service_role_all" ON permission_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "perm_requests_tenant_isolation" ON permission_requests FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

ALTER TABLE permission_used ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perm_used_service_role_all" ON permission_used;
DROP POLICY IF EXISTS "perm_used_tenant_isolation" ON permission_used;
CREATE POLICY "perm_used_service_role_all" ON permission_used FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "perm_used_tenant_isolation" ON permission_used FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');


-- ============================================================
-- SECCIÓN 6: SUPABASE STORAGE (fotos y documentos)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('employee-photos', 'employee-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('employee-documents', 'employee-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- RLS Policies para employee-photos
DROP POLICY IF EXISTS "tenant_read_photos" ON storage.objects;
DROP POLICY IF EXISTS "tenant_insert_photos" ON storage.objects;
DROP POLICY IF EXISTS "tenant_update_photos" ON storage.objects;
DROP POLICY IF EXISTS "tenant_delete_photos" ON storage.objects;
DROP POLICY IF EXISTS "service_role_all_photos" ON storage.objects;

CREATE POLICY "tenant_read_photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'employee-photos');

CREATE POLICY "tenant_insert_photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'employee-photos'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

CREATE POLICY "tenant_update_photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'employee-photos'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

CREATE POLICY "tenant_delete_photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'employee-photos'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

CREATE POLICY "service_role_all_photos" ON storage.objects
  FOR ALL USING (auth.role() = 'service_role' AND bucket_id = 'employee-photos');

-- RLS Policies para employee-documents
DROP POLICY IF EXISTS "tenant_read_documents" ON storage.objects;
DROP POLICY IF EXISTS "tenant_insert_documents" ON storage.objects;
DROP POLICY IF EXISTS "tenant_update_documents" ON storage.objects;
DROP POLICY IF EXISTS "tenant_delete_documents" ON storage.objects;
DROP POLICY IF EXISTS "service_role_all_documents" ON storage.objects;

CREATE POLICY "tenant_read_documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

CREATE POLICY "tenant_insert_documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

CREATE POLICY "tenant_update_documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

CREATE POLICY "tenant_delete_documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

CREATE POLICY "service_role_all_documents" ON storage.objects
  FOR ALL USING (auth.role() = 'service_role' AND bucket_id = 'employee-documents');


-- ============================================================
-- RESUMEN: 15 tablas + 2 buckets + 1 columna reports_to
-- ============================================================
-- employees (columnas adicionales: gender, free_days, schedule_entry, schedule_exit, reports_to)
-- departments
-- positions
-- attendance
-- attendance_holidays
-- attendance_deduction_config
-- attendance_schedules
-- payroll_config
-- payroll_closed
-- payroll_deductions
-- permission_types
-- permission_requests
-- permission_used
-- Storage: employee-photos (público)
-- Storage: employee-documents (privado)
