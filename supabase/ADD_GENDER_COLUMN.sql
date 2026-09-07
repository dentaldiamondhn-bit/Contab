-- Ejecutar en Supabase SQL Editor
-- Agregar columna gender a la tabla employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender TEXT;
