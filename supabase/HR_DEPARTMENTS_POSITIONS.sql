-- ========================================
-- HR: DEPARTMENTS Y POSITIONS EN SUPABASE
-- ========================================
-- Ejecutar en Supabase Dashboard -> SQL Editor

-- 1. Crear tabla departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    manager VARCHAR(255) DEFAULT '',
    parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla positions
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

-- 3. Crear índices
CREATE INDEX IF NOT EXISTS idx_departments_tenant ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_positions_tenant ON positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_positions_department ON positions(department);

-- 4. Eliminar RLS existente si hay
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- 5. Eliminar políticas existentes
DROP POLICY IF EXISTS "departments_tenant_isolation" ON departments;
DROP POLICY IF EXISTS "departments_service_role_all" ON departments;
DROP POLICY IF EXISTS "positions_tenant_isolation" ON positions;
DROP POLICY IF EXISTS "positions_service_role_all" ON positions;

-- 6. Crear políticas RLS para departments
CREATE POLICY "departments_service_role_all" ON departments
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "departments_tenant_isolation" ON departments
    FOR ALL
    USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- 7. Crear políticas RLS para positions
CREATE POLICY "positions_service_role_all" ON positions
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "positions_tenant_isolation" ON positions
    FOR ALL
    USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- 8. Migrar datos de localStorage existentes (ejecutar solo una vez)
-- NOTA: Estos datos se insertan para ANGELOH7 como ejemplo.
-- Si ya tienes datos en localStorage, usa la API para migrarlos.

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
