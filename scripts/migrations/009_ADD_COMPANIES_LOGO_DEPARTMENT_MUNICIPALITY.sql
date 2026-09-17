-- =====================================================
-- 009_ADD_COMPANIES_LOGO_DEPARTMENT_MUNICIPALITY.sql
-- Agrega columnas de logo y ubicación a la tabla companies
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Logo URL de la empresa (guarda la publicUrl del bucket company-logos)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Ubicación estructurada: departamento y municipio de Honduras
ALTER TABLE companies ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS municipality TEXT;

-- Verificar columnas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY ordinal_position;