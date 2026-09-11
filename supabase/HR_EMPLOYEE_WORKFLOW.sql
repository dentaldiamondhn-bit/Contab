-- Agregar columnas de workflow de estado a employees
-- termination_date se usa para desactivar controles de asistencia desde esa fecha

ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_reason TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_requested_by TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_performed_by TEXT;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS suspension_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS suspension_requested_by TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS suspension_performed_by TEXT;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS reactivation_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reactivation_reason TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reactivation_requested_by TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reactivation_performed_by TEXT;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS rehireable BOOLEAN DEFAULT true;
