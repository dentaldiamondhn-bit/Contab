-- Migración: Hacer phoneNumber requerido en la tabla Tenant
-- Primero, establecer un valor por defecto para registros existentes que tengan NULL
UPDATE "Tenant" 
SET phonenumber = 'No especificado' 
WHERE phonenumber IS NULL OR phonenumber = '';

-- Cambiar la columna para que sea NOT NULL
ALTER TABLE "Tenant" 
ALTER COLUMN phonenumber SET NOT NULL;

-- Agregar un valor por defecto
ALTER TABLE "Tenant" 
ALTER COLUMN phonenumber SET DEFAULT 'No especificado';
