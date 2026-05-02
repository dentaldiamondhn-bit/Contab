-- Fix the ON CONFLICT error in tenant_plan_statistics table
-- The update_tenant_statistics function needs a unique constraint on tenant_id

-- 1. Check current constraints on tenant_plan_statistics
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
     ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'tenant_plan_statistics' AND tc.table_schema = 'public'
ORDER BY tc.constraint_name;

-- 2. Add unique constraint on tenant_id if it doesn't exist
-- This will fix the "ON CONFLICT" error
ALTER TABLE tenant_plan_statistics 
ADD CONSTRAINT tenant_plan_statistics_tenant_id_key 
UNIQUE (tenant_id);

-- 3. Verify the constraint was added
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
     ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'tenant_plan_statistics' 
  AND tc.constraint_type = 'UNIQUE'
  AND kcu.column_name = 'tenant_id';
