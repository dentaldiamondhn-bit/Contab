-- Ejecutar en Supabase SQL Editor
-- Agregar columnas de horario individual por empleado
ALTER TABLE employees ADD COLUMN IF NOT EXISTS schedule_entry TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS schedule_exit TEXT;

-- Migrar datos existentes de schedule_hours a entry/exit
UPDATE employees 
SET schedule_entry = SPLIT_PART(schedule_hours, ' - ', 1),
    schedule_exit = SPLIT_PART(schedule_hours, ' - ', 2)
WHERE schedule_hours LIKE '% - %' 
  AND (schedule_entry IS NULL OR schedule_entry = '');

-- Verificar
SELECT employee_code, schedule_hours, schedule_entry, schedule_exit 
FROM employees 
WHERE tenant_id = 'ANGELOH7' 
LIMIT 5;
