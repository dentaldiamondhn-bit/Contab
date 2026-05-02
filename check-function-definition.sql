-- Check the update_tenant_statistics function definition
-- This function is called by the trigger and likely causes the ON CONFLICT error

SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_tenant_statistics';

-- Also check the update_tenant_timestamp function
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_tenant_timestamp';
