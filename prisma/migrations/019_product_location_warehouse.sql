-- 019_product_location_warehouse.sql
-- Agrega columna `warehouse_id` (almacén al que pertenece la ubicación)
-- a la tabla `product_location`. Idempotente.
-- Almacena el UUID de warehouse como TEXT (mismo patrón que product.location_id).

ALTER TABLE product_location ADD COLUMN IF NOT EXISTS warehouse_id TEXT;

CREATE INDEX IF NOT EXISTS idx_product_location_warehouse ON product_location (warehouse_id);