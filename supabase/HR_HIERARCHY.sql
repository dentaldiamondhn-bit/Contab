-- HR_HIERARCHY.sql
-- Agrega columna reports_to para jerarquía de empleados (quién reporta a quién)

-- 1. Agregar columna reports_to (FK a employees.id)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES employees(id) ON DELETE SET NULL;

-- 2. Crear índice para consultas rápidas de subordinados
CREATE INDEX IF NOT EXISTS idx_employees_reports_to ON employees(reports_to);

-- 3. Comentario en la columna
COMMENT ON COLUMN employees.reports_to IS 'ID del empleado directo al que reporta (jefe directo)';

-- 4. RLS policy para reports_to
-- (ya cubierta por las policies existentes de employees)
