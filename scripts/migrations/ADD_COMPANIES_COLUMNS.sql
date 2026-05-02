-- Agregar columnas faltantes a la tabla companies
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas que faltan
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rtn TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Honduras';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Verificar columnas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies'
ORDER BY ordinal_position;
