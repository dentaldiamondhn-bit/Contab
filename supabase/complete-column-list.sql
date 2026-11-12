-- Get complete column list with nullable info
-- This will show us all columns in one query

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    CASE 
        WHEN is_nullable = 'NO' THEN 'REQUIRED'
        ELSE 'OPTIONAL'
    END as column_status
FROM information_schema.columns 
WHERE table_name = 'Tenant' 
  AND table_schema = 'public' 
ORDER BY 
    CASE WHEN is_nullable = 'NO' THEN 1 ELSE 2 END,
    ordinal_position;
