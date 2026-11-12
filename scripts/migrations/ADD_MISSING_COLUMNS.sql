-- =====================================================
-- AGREGAR COLUMNAS FALTANTES - VERSIÓN DIRECTA
-- =====================================================

-- Primero mostrar estructura actual
SELECT 'Estructura actual de la tabla Customer:' as info;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Customer' AND table_schema = 'public' ORDER BY ordinal_position;

-- Agregar columnas faltantes directamente (sin verificaciones complejas)
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "contactCode" VARCHAR(20) UNIQUE;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "contactType" VARCHAR(50);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "otherTypeDescription" VARCHAR(200);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "phone2" VARCHAR(20);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "observations" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "accounting" VARCHAR(50);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "retentions" VARCHAR(50);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "taxpayerType" VARCHAR(50);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "createdat" TIMESTAMP DEFAULT NOW();
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "updatedat" TIMESTAMP DEFAULT NOW();

-- Verificar que se agregaron correctamente
SELECT 'Columnas después de la actualización:' as info;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Customer' AND table_schema = 'public' ORDER BY ordinal_position;

-- Probar insert con las nuevas columnas
INSERT INTO "Customer" (
    tenantid, 
    rtn, 
    name, 
    "contactCode",
    contactType,
    observations,
    createdat,
    updatedat
) VALUES (
    'test', 
    'TEST12345678', 
    'Test Contact',
    'CT001TEST',
    'persona',
    'Test observation',
    NOW(),
    NOW()
) ON CONFLICT (rtn, tenantid) DO NOTHING;

-- Verificar inserción
SELECT 'Prueba de inserción:' as info;
SELECT id, tenantid, rtn, name, "contactCode", contactType, observations FROM "Customer" WHERE rtn = 'TEST12345678' AND tenantid = 'test';

-- Limpiar prueba
DELETE FROM "Customer" WHERE rtn = 'TEST12345678' AND tenantid = 'test';

SELECT 'Columnas agregadas exitosamente' as status;
