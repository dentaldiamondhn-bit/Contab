-- 016_product_image_url.sql
-- Agrega columna `image_url` (foto del producto) a la tabla `product`.
-- Idempotente: seguro de re-ejecutar en el SQL Editor de Supabase.

ALTER TABLE product ADD COLUMN IF NOT EXISTS image_url TEXT;