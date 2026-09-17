-- Final verification before testing
-- Run this to confirm database is ready

-- 1. Confirm columns exist
SELECT 'Column Check' as check_type, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'Tenant' AND table_schema = 'public';

-- 2. Confirm primary key exists
SELECT 'Primary Key' as check_type, tc.constraint_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'Tenant' AND tc.constraint_type = 'PRIMARY KEY';

-- 3. Test direct insert (this is what Supabase tries to do)
INSERT INTO Tenant (
    id, businessname, businessrtn, businessemail, businessaddress,
    country, timezone, currency, subscriptionplan, maxusers, maxstorage,
    maxtransactions, monthlycost, isactive, createdat, updatedat,
    business_name, business_address, subscription_plan, max_users, is_active,
    tenant_code, modules
) VALUES (
    'FINAL-TEST-999', 'Final Test Co', '', 'final@test.com', '',
    'HN', 'America/Tegucigalpa', 'HNL', 'BASIC', 5, 1000,
    1000, 0, true, NOW(), NOW(),
    'Final Test Co', '', 'BASIC', 5, true,
    'FINAL-TEST-999', 'basic'
)
ON CONFLICT (id) DO UPDATE SET updatedat = NOW()
RETURNING id, businessname, createdat;

-- 4. Clean up
DELETE FROM Tenant WHERE id = 'FINAL-TEST-999';

-- 5. Count existing tenants
SELECT 'Total Tenants' as check_type, COUNT(*) as count FROM Tenant;
