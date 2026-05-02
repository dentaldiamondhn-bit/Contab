-- Check actual column names in tenant_plan_statistics
-- There might be a mismatch between the column name in ON CONFLICT and actual column

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'tenant_plan_statistics' AND table_schema = 'public' 
ORDER BY ordinal_position;
