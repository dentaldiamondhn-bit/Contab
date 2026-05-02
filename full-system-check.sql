-- Comprehensive system check for onboarding
-- Checks all tables, constraints, and triggers involved

-- 1. Check Tenant table columns
SELECT 'Tenant Columns' as check_type, column_name, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Tenant' AND table_schema = 'public';

-- 2. Check tenant_plan_statistics constraints
SELECT 'Statistics Constraints' as check_type, tc.constraint_name, tc.constraint_type, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'tenant_plan_statistics';

-- 3. Check User table columns (for user creation)
SELECT 'User Columns' as check_type, column_name, is_nullable
FROM information_schema.columns 
WHERE table_name = 'User' AND table_schema = 'public';

-- 4. Test direct insert into Tenant (bypass triggers)
INSERT INTO Tenant (
    id, businessname, businessrtn, businessemail, businessaddress,
    country, timezone, currency, subscriptionplan, maxusers, maxstorage,
    maxtransactions, monthlycost, isactive, createdat, updatedat,
    business_name, business_address, subscription_plan, max_users, is_active
) VALUES (
    'SYS-CHECK-001', 'System Check', '', 'syscheck@test.com', '',
    'HN', 'America/Tegucigalpa', 'HNL', 'BASIC', 5, 1000,
    1000, 0, true, NOW(), NOW(),
    'System Check', '', 'BASIC', 5, true
)
ON CONFLICT (id) DO NOTHING
RETURNING id, businessname;

-- Clean up
DELETE FROM Tenant WHERE id = 'SYS-CHECK-001';
DELETE FROM tenant_plan_statistics WHERE tenant_id = 'SYS-CHECK-001';
