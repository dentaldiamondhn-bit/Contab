-- Simple data check using only confirmed existing columns
-- This will help us identify conflicts without using uncertain columns

-- 1. Check if our test email already exists
SELECT id, business_email, business_name
FROM Tenant 
WHERE business_email = 'jainreyes8763@gmail.com';

-- 2. Check if our test tenant code already exists
SELECT id, tenant_code, business_name
FROM Tenant 
WHERE tenant_code LIKE 'TEST-%';

-- 3. Count total tenants
SELECT COUNT(*) as total_tenants FROM Tenant;

-- 4. Show recent tenants
SELECT id, business_name, business_email, created_at
FROM Tenant 
ORDER BY created_at DESC 
LIMIT 5;
