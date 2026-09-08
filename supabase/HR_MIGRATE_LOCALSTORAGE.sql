-- ========================================
-- HR: MIGRAR LOCALSTORAGE A SUPABASE
-- ========================================
-- Ejecutar en Supabase Dashboard -> SQL Editor

-- ========================================
-- 1. TABLA: attendance (asistencia diaria)
-- ========================================
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

-- ========================================
-- 2. TABLA: attendance_holidays (feriados)
-- ========================================
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

-- ========================================
-- 3. TABLA: attendance_deduction_config
-- ========================================
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

-- ========================================
-- 4. TABLA: attendance_schedules
-- ========================================
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

-- ========================================
-- 5. TABLA: payroll_config
-- ========================================
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

-- ========================================
-- 6. TABLA: payroll_closed (nominas cerradas)
-- ========================================
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

-- ========================================
-- 7. TABLA: payroll_deductions (deducciones por empleado)
-- ========================================
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

-- ========================================
-- 8. TABLA: permission_types (tipos de permiso)
-- ========================================
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

-- ========================================
-- 9. TABLA: permission_requests (solicitudes de permiso)
-- ========================================
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

-- ========================================
-- 10. TABLA: permission_used (uso de permisos)
-- ========================================
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

-- ========================================
-- RLS POLICIES
-- ========================================

-- attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_service_role_all" ON attendance;
DROP POLICY IF EXISTS "attendance_tenant_isolation" ON attendance;
CREATE POLICY "attendance_service_role_all" ON attendance FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "attendance_tenant_isolation" ON attendance FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- attendance_holidays
ALTER TABLE attendance_holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "holidays_service_role_all" ON attendance_holidays;
DROP POLICY IF EXISTS "holidays_tenant_isolation" ON attendance_holidays;
CREATE POLICY "holidays_service_role_all" ON attendance_holidays FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "holidays_tenant_isolation" ON attendance_holidays FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- attendance_deduction_config
ALTER TABLE attendance_deduction_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attd_config_service_role_all" ON attendance_deduction_config;
DROP POLICY IF EXISTS "attd_config_tenant_isolation" ON attendance_deduction_config;
CREATE POLICY "attd_config_service_role_all" ON attendance_deduction_config FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "attd_config_tenant_isolation" ON attendance_deduction_config FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- attendance_schedules
ALTER TABLE attendance_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedules_service_role_all" ON attendance_schedules;
DROP POLICY IF EXISTS "schedules_tenant_isolation" ON attendance_schedules;
CREATE POLICY "schedules_service_role_all" ON attendance_schedules FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "schedules_tenant_isolation" ON attendance_schedules FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- payroll_config
ALTER TABLE payroll_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_config_service_role_all" ON payroll_config;
DROP POLICY IF EXISTS "payroll_config_tenant_isolation" ON payroll_config;
CREATE POLICY "payroll_config_service_role_all" ON payroll_config FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "payroll_config_tenant_isolation" ON payroll_config FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- payroll_closed
ALTER TABLE payroll_closed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_closed_service_role_all" ON payroll_closed;
DROP POLICY IF EXISTS "payroll_closed_tenant_isolation" ON payroll_closed;
CREATE POLICY "payroll_closed_service_role_all" ON payroll_closed FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "payroll_closed_tenant_isolation" ON payroll_closed FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- payroll_deductions
ALTER TABLE payroll_deductions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_deductions_service_role_all" ON payroll_deductions;
DROP POLICY IF EXISTS "payroll_deductions_tenant_isolation" ON payroll_deductions;
CREATE POLICY "payroll_deductions_service_role_all" ON payroll_deductions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "payroll_deductions_tenant_isolation" ON payroll_deductions FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- permission_types
ALTER TABLE permission_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perm_types_service_role_all" ON permission_types;
DROP POLICY IF EXISTS "perm_types_tenant_isolation" ON permission_types;
CREATE POLICY "perm_types_service_role_all" ON permission_types FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "perm_types_tenant_isolation" ON permission_types FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- permission_requests
ALTER TABLE permission_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perm_requests_service_role_all" ON permission_requests;
DROP POLICY IF EXISTS "perm_requests_tenant_isolation" ON permission_requests;
CREATE POLICY "perm_requests_service_role_all" ON permission_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "perm_requests_tenant_isolation" ON permission_requests FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- permission_used
ALTER TABLE permission_used ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perm_used_service_role_all" ON permission_used;
DROP POLICY IF EXISTS "perm_used_tenant_isolation" ON permission_used;
CREATE POLICY "perm_used_service_role_all" ON permission_used FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "perm_used_tenant_isolation" ON permission_used FOR ALL USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');
