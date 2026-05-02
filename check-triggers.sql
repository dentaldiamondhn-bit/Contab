-- Check for triggers on Tenant table that might cause ON CONFLICT
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'Tenant'
ORDER BY trigger_name;

-- Also check for any functions that might be involved
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_definition LIKE '%Tenant%'
   OR routine_definition LIKE '%ON CONFLICT%'
ORDER BY routine_name;
