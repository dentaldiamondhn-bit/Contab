-- =============================================
-- PASO 1: Ejecutar este SQL en Supabase Dashboard
-- https://supabase.com/dashboard → SQL Editor
-- =============================================

-- Agregar columna gender a la tabla employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender TEXT;

-- Agregar columna free_days a la tabla employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS free_days INTEGER[] DEFAULT '{}';

-- Verificar que se agregaron
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' AND column_name IN ('gender', 'free_days');
