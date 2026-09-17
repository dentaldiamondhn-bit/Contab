-- Simple conflict check using only confirmed columns
-- Check for existing data that might cause conflicts

-- Check if email already exists
SELECT id, business_name, business_email, created_at
FROM Tenant 
WHERE business_email = 'jainreyes8763@gmail.com';

-- Check for TEST codes
SELECT id, tenant_code, business_name, created_at
FROM Tenant 
WHERE tenant_code LIKE 'TEST%';
