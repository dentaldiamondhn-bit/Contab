-- =====================================================
-- VERIFICAR NOMBRES EXACTOS DE COLUMNAS
-- =====================================================

-- Mostrar todas las columnas con nombres exactos
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar específicamente las columnas que necesitamos
SELECT 
    column_name,
    CASE 
        WHEN column_name = 'contactCode' THEN '✅ contactCode - EXACT MATCH'
        WHEN column_name = 'contactcode' THEN '⚠️  contactcode - LOWERCASE'
        WHEN column_name = 'CONTACTCODE' THEN '⚠️  CONTACTCODE - UPPERCASE'
        WHEN column_name ILIKE 'contactcode' THEN '❌ contactCode - CASE MISMATCH'
        ELSE '❓ OTHER'
    END as status_analysis
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = 'public'
AND column_name ILIKE 'contactcode';

-- Insertar una fila de prueba para verificar que la columna funciona
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

-- Verificar que la inserción funcionó
SELECT 
    id,
    tenantid,
    rtn,
    name,
    "contactCode",
    contactType,
    observations,
    createdat
FROM "Customer" 
WHERE rtn = 'TEST12345678' AND tenantid = 'test';

-- Limpiar datos de prueba
DELETE FROM "Customer" 
WHERE rtn = 'TEST12345678' AND tenantid = 'test';

SELECT 'Column verification completed' as status;
