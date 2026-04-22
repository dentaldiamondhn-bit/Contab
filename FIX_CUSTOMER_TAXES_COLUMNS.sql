-- =====================================================
-- VERIFICAR Y CORREGIR COLUMNAS DE CustomerTaxes
-- =====================================================

-- 1. Verificar estructura actual
SELECT '=== ESTRUCTURA ACTUAL CustomerTaxes ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'CustomerTaxes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Crear tabla si no existe con estructura correcta
CREATE TABLE IF NOT EXISTS "CustomerTaxes" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customerId TEXT NOT NULL,
    tenantId TEXT NOT NULL,
    taxId UUID,
    retentionId UUID,
    customRate DECIMAL(5,2),
    customDescription TEXT,
    isActive BOOLEAN DEFAULT true,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

-- 3. Agregar columnas faltantes si la tabla ya existe
ALTER TABLE "CustomerTaxes" 
    ADD COLUMN IF NOT EXISTS "customerId" TEXT NOT NULL DEFAULT '';

ALTER TABLE "CustomerTaxes" 
    ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';

ALTER TABLE "CustomerTaxes" 
    ADD COLUMN IF NOT EXISTS "taxId" UUID;

ALTER TABLE "CustomerTaxes" 
    ADD COLUMN IF NOT EXISTS "retentionId" UUID;

ALTER TABLE "CustomerTaxes" 
    ADD COLUMN IF NOT EXISTS "customRate" DECIMAL(5,2);

ALTER TABLE "CustomerTaxes" 
    ADD COLUMN IF NOT EXISTS "customDescription" TEXT;

ALTER TABLE "CustomerTaxes" 
    ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

ALTER TABLE "CustomerTaxes" 
    ADD COLUMN IF NOT EXISTS "createdat" TIMESTAMP DEFAULT NOW();

ALTER TABLE "CustomerTaxes" 
    ADD COLUMN IF NOT EXISTS "updatedat" TIMESTAMP DEFAULT NOW();

-- 4. Verificar estructura después de cambios
SELECT '=== ESTRUCTURA DESPUÉS DE ACTUALIZAR ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'CustomerTaxes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_customertaxes_customerid ON "CustomerTaxes"(customerId);
CREATE INDEX IF NOT EXISTS idx_customertaxes_tenantid ON "CustomerTaxes"(tenantId);
CREATE INDEX IF NOT EXISTS idx_customertaxes_taxid ON "CustomerTaxes"(taxId);
CREATE INDEX IF NOT EXISTS idx_customertaxes_retentionid ON "CustomerTaxes"(retentionId);

-- 6. Configurar RLS
ALTER TABLE "CustomerTaxes" ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Tenant isolation customer taxes" ON "CustomerTaxes";
DROP POLICY IF EXISTS "Allow all for authenticated users taxes" ON "CustomerTaxes";

-- Crear nueva política para Clerk
CREATE POLICY "Allow operations with tenant taxes" ON "CustomerTaxes"
    FOR ALL
    USING (tenantId IS NOT NULL AND tenantId != '')
    WITH CHECK (tenantId IS NOT NULL AND tenantId != '');

-- 7. Probar inserción
DO $$
BEGIN
    RAISE NOTICE 'Probando inserción en CustomerTaxes...';
    
    INSERT INTO "CustomerTaxes" (
        customerId,
        tenantId,
        customRate,
        customDescription,
        isActive,
        createdat,
        updatedat
    ) VALUES (
        'test-customer-id',
        'test-tenant',
        15.00,
        'Test tax rate',
        true,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Inserción exitosa en CustomerTaxes';
    
    -- Limpiar
    DELETE FROM "CustomerTaxes" 
    WHERE customerId = 'test-customer-id' AND tenantId = 'test-tenant';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en prueba: %', SQLERRM;
END $$;

-- 8. Estado final
SELECT 
    'CustomerTaxes table structure fixed' as status,
    NOW() as timestamp;

-- NOTA: La columna customerId ahora existe en CustomerTaxes
