-- 018_product_location_image_url.sql
-- Agrega columna `image_url` (foto de la ubicación) a la tabla `product_location`.
-- Idempotente: seguro de re-ejecutar en el SQL Editor de Supabase.

ALTER TABLE product_location ADD COLUMN IF NOT EXISTS image_url TEXT;