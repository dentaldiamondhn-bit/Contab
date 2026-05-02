-- Comprehensive table verification
-- Check constraints, indexes, and column consistency

-- 1. Check all constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS references_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
     ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
     ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'Tenant' AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 2. Check column defaults
SELECT column_name, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Tenant' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Test if we can insert a minimal record
INSERT INTO Tenant (
    id, businessname, businessrtn, businessemail, businessaddress,
    country, timezone, currency, subscriptionplan, maxusers, maxstorage,
    maxtransactions, monthlycost, isactive, createdat, updatedat,
    business_name, business_address, subscription_plan, max_users, is_active
) VALUES (
    'VERIFY-TEST-001', 'Test', '', 'test@test.com', '',
    'HN', 'America/Tegucigalpa', 'HNL', 'BASIC', 5, 1000,
    1000, 0, true, NOW(), NOW(),
    'Test', '', 'BASIC', 5, true
)
ON CONFLICT (id) DO NOTHING
RETURNING id;

-- Clean up test
-- DELETE FROM Tenant WHERE id = 'VERIFY-TEST-001';
