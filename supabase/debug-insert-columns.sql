-- Script para contar columnas y valores en el INSERT
-- Identificar el problema de "more target columns than expressions"

-- 1. Contar columnas en el INSERT
SELECT 
    'Column count in INSERT:' as info,
    COUNT(*) as column_count
FROM (
    SELECT 
        'id' as column_name
    UNION SELECT 'tenant_id'
    UNION SELECT 'cai'
    UNION SELECT 'start_number'
    UNION SELECT 'end_number'
    UNION SELECT 'current_number'
    UNION SELECT 'issue_date'
    UNION SELECT 'expiration_date'
    UNION SELECT 'status'
    UNION SELECT 'created_at'
    UNION SELECT 'updated_at'
) as column_list;

-- 2. Contar valores en el INSERT
SELECT 
    'Value count in INSERT:' as info,
    COUNT(*) as value_count
FROM (
    SELECT 'test-api-cai-simple' as value_name
    UNION SELECT '1'
    UNION SELECT 'API-TEST-CAI-123456789012345678901234'
    UNION SELECT '5000'
    UNION SELECT '6000'
    UNION SELECT '5000'
    UNION SELECT '2026-05-04'
    UNION SELECT '2027-05-04'
    UNION SELECT 'active'
    UNION SELECT 'NOW()'
    UNION SELECT 'NOW()'
) as value_list;

-- 3. Comparar conteos
SELECT 
    'Comparison:' as info,
    column_count,
    value_count,
    CASE 
        WHEN column_count = value_count THEN 'MATCH'
        ELSE 'MISMATCH - More columns than values'
    END as status
FROM (
    SELECT 
        (SELECT COUNT(*) FROM (
            SELECT 'id' as column_name UNION SELECT 'tenant_id' UNION SELECT 'cai' UNION SELECT 'start_number' UNION SELECT 'end_number' UNION SELECT 'current_number' UNION SELECT 'issue_date' UNION SELECT 'expiration_date' UNION SELECT 'status' UNION SELECT 'created_at' UNION SELECT 'updated_at'
        ) as column_list) as column_count,
        (SELECT COUNT(*) FROM (
            SELECT 'test-api-cai-simple' as value_name UNION SELECT '1' UNION SELECT 'API-TEST-CAI-123456789012345678901234' UNION SELECT '5000' UNION SELECT '6000' UNION SELECT '5000' UNION SELECT '2026-05-04' UNION SELECT '2027-05-04' UNION SELECT 'active' UNION SELECT 'NOW()' UNION SELECT 'NOW()'
        ) as value_list) as value_count
) comparison;
