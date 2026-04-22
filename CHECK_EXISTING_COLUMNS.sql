-- =====================================================
-- VERIFICAR COLUMNAS EXISTENTES EN LA TABLA Customer
-- =====================================================

-- Mostrar todas las columnas actuales con sus nombres exactos
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar específicamente las columnas que necesitamos
SELECT 
    column_name,
    CASE 
        WHEN column_name IN ('contactCode', 'contactcode', 'CONTACTCODE') THEN 'contactCode - EXISTE'
        WHEN column_name IN ('contactType', 'contacttype', 'CONTACTTYPE') THEN 'contactType - EXISTE'
        WHEN column_name IN ('otherTypeDescription', 'othertypedescription', 'OTHERTYPEDESCRIPTION') THEN 'otherTypeDescription - EXISTE'
        WHEN column_name IN ('phone2', 'PHONE2') THEN 'phone2 - EXISTE'
        WHEN column_name IN ('observations', 'OBSERVATIONS') THEN 'observations - EXISTE'
        WHEN column_name IN ('accounting', 'ACCOUNTING') THEN 'accounting - EXISTE'
        WHEN column_name IN ('retentions', 'RETENTIONS') THEN 'retentions - EXISTE'
        WHEN column_name IN ('taxpayerType', 'taxpayertype', 'TAXPAYERTYPE') THEN 'taxpayerType - EXISTE'
        ELSE 'OTRA COLUMNA'
    END as status
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = 'public'
AND column_name ILIKE ANY(ARRAY['contactcode', 'contacttype', 'othertypedescription', 'phone2', 'observations', 'accounting', 'retentions', 'taxpayertype'])
ORDER BY column_name;
