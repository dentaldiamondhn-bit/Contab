-- Migración 011: permitir múltiples empresas (companies) por tenant
-- Contexto: el modo "Soy Contador" con varias empresas crea 1 tenant y N companies.
-- La restricción única en companies.tenant_id (companies_tenant_id_key) solo permitía
-- una empresa por tenant y hacía fallar el onboarding con:
--   duplicate key value violates unique constraint "companies_tenant_id_key"
-- Ejecutar en Supabase SQL Editor.

-- 1) Eliminar la restricción única si existe (caso normal: constraint)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_tenant_id_key'
      AND conrelid = 'companies'::regclass
  ) THEN
    ALTER TABLE companies DROP CONSTRAINT companies_tenant_id_key;
  END IF;
END $$;

-- 2) Eliminar el índice único si fue creado como índice suelto
DROP INDEX IF EXISTS companies_tenant_id_key;

-- 3) Índice NO único para mantener el rendimiento de las consultas por tenant
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies(tenant_id);

-- Verificar que ya no quede la restricción/índice único sobre tenant_id (debe salir vacío)
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'companies'::regclass
  AND conname = 'companies_tenant_id_key';
