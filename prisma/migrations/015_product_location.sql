-- 015_product_location.sql
-- Agrega columna `location` (ubicación física) a la tabla `product`.
-- Idempotente: seguro de re-ejecutar en el SQL Editor de Supabase.

ALTER TABLE product ADD COLUMN IF NOT EXISTS location TEXT;

-- Índice opcional para filtrar/buscar por ubicación.
CREATE INDEX IF NOT EXISTS idx_product_location ON product (location);