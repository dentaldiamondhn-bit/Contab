-- =====================================================
-- VERIFICAR Y CORREGIR COLUMNAS DE CustomerRetentions
-- =====================================================

-- 1. Verificar estructura actual
SELECT '=== ESTRUCTURA ACTUAL CustomerRetentions ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'CustomerRetentions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Crear tabla si no existe con estructura correcta
CREATE TABLE IF NOT EXISTS "CustomerRetentions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customerId TEXT NOT NULL,
    tenantId TEXT NOT NULL,
    account VARCHAR(50) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    description TEXT,
    isActive BOOLEAN DEFAULT true,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

-- 3. Agregar columnas faltantes si la tabla ya existe
ALTER TABLE "CustomerRetentions" 
    ADD COLUMN IF NOT EXISTS "customerId" TEXT NOT NULL DEFAULT '';

ALTER TABLE "CustomerRetentions" 
    ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';

ALTER TABLE "CustomerRetentions" 
    ADD COLUMN IF NOT EXISTS "account" VARCHAR(50) NOT NULL DEFAULT '';

ALTER TABLE "CustomerRetentions" 
    ADD COLUMN IF NOT EXISTS "percentage" DECIMAL(5,2) NOT NULL DEFAULT 0;

ALTER TABLE "CustomerRetentions" 
    ADD COLUMN IF NOT EXISTS "description" TEXT;

ALTER TABLE "CustomerRetentions" 
    ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

ALTER TABLE "CustomerRetentions" 
    ADD COLUMN IF NOT EXISTS "createdat" TIMESTAMP DEFAULT NOW();

ALTER TABLE "CustomerRetentions" 
    ADD COLUMN IF NOT EXISTS "updatedat" TIMESTAMP DEFAULT NOW();

-- 4. Verificar estructura después de cambios
SELECT '=== ESTRUCTURA DESPUÉS DE ACTUALIZAR ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'CustomerRetentions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_customerretentions_customerid ON "CustomerRetentions"(customerId);
CREATE INDEX IF NOT EXISTS idx_customerretentions_tenantid ON "CustomerRetentions"(tenantId);

-- 6. Configurar RLS
ALTER TABLE "CustomerRetentions" ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow operations with tenant retentions" ON "CustomerRetentions";
DROP POLICY IF EXISTS "Allow all operations retentions" ON "CustomerRetentions";
DROP POLICY IF EXISTS "Allow all for authenticated users retentions" ON "CustomerRetentions";
DROP POLICY IF EXISTS "Tenant isolation customer retentions" ON "CustomerRetentions";

-- Crear nueva política para Clerk
CREATE POLICY "Allow operations with tenant retentions" ON "CustomerRetentions"
    FOR ALL
    USING (tenantId IS NOT NULL AND tenantId != '')
    WITH CHECK (tenantId IS NOT NULL AND tenantId != '');

-- 7. Probar inserción
DO $$
BEGIN
    RAISE NOTICE 'Probando inserción en CustomerRetentions...';
    
    INSERT INTO "CustomerRetentions" (
        customerId,
        tenantId,
        account,
        percentage,
        description,
        isActive,
        createdat,
        updatedat
    ) VALUES (
        'test-customer-id',
        'test-tenant',
        '2102-02',
        12.50,
        'Test retention',
        true,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Inserción exitosa en CustomerRetentions';
    
    -- Limpiar
    DELETE FROM "CustomerRetentions" 
    WHERE customerId = 'test-customer-id' AND tenantId = 'test-tenant';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error en prueba: %', SQLERRM;
END $$;

-- 8. Estado final
SELECT 
    'CustomerRetentions table structure fixed' as status,
    NOW() as timestamp;

-- NOTA: La columna customerId ahora existe y debería funcionar con el código del frontend
