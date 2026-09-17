-- Migración 010: columna industry (rubro/giro) en companies y onboarding_companies
-- Ejecutar en Supabase SQL Editor

-- Asegurar la columna industry en companies (doblemente idempotente)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry TEXT;

-- Asegurar la columna industry en onboarding_companies (referencia de onboarding)
ALTER TABLE onboarding_companies ADD COLUMN IF NOT EXISTS industry TEXT;

-- Verificar
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('companies', 'onboarding_companies')
  AND column_name = 'industry'
ORDER BY table_name;