-- =====================================================
-- FORZAR ACTUALIZACIÓN DE ESQUEMA PARA POSTGREST
-- =====================================================

-- 1. Crear una tabla temporal para forzar actualización
CREATE TEMP TABLE IF NOT EXISTS schema_refresh_trigger (
    id SERIAL PRIMARY KEY,
    refresh_time TIMESTAMP DEFAULT NOW()
);

-- 2. Insertar y eliminar para forzar cambio de esquema
INSERT INTO schema_refresh_trigger DEFAULT VALUES;
DELETE FROM schema_refresh_trigger WHERE id = 1;

-- 3. Recrear la vista del esquema si existe
DROP VIEW IF EXISTS customer_schema_view;
CREATE VIEW customer_schema_view AS
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = 'public';

-- 4. Actualizar estadísticas de la tabla
ANALYZE "Customer";

-- 5. Forzar reconstrucción de índices
REINDEX TABLE "Customer";

-- 6. Actualizar timestamp de modificación de la tabla
-- (Esto ayuda a que PostgREST detecte cambios)
ALTER TABLE "Customer" ALTER COLUMN updatedat SET DEFAULT NOW();
ALTER TABLE "Customer" ALTER COLUMN updatedat DROP DEFAULT;
ALTER TABLE "Customer" ALTER COLUMN updatedat SET DEFAULT NOW();

-- 7. Verificar estado final
SELECT 
    'Schema refresh completed' as status,
    NOW() as refresh_time,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = 'public';

-- 8. Mostrar columnas críticas para verificar
SELECT 
    column_name,
    data_type,
    'CRITICAL COLUMN' as importance
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = 'public'
AND column_name ILIKE ANY(ARRAY['contactcode', 'contacttype', 'observations', 'taxpayertype'])
ORDER BY column_name;
