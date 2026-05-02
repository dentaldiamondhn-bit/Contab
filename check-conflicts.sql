-- Check for existing data that conflicts with our insert
-- Focus on columns with UNIQUE constraints

-- 1. Check if email already exists (UNIQUE constraint)
SELECT 'business_email check' as check_type, id, business_email, businessemail, businessname
FROM Tenant 
WHERE business_email = 'jainreyes8763@gmail.com' 
   OR businessemail = 'jainreyes8763@gmail.com';

-- 2. Check if tenant code pattern exists
SELECT 'tenant_code check' as check_type, id, tenant_code, businessname, businessemail
FROM Tenant 
WHERE tenant_code LIKE 'TEST%' OR tenant_code LIKE 'TES%';

-- 3. List all existing tenants
SELECT 'all tenants' as check_type, id, tenant_code, business_email, businessemail, createdat
FROM Tenant 
ORDER BY createdat DESC 
LIMIT 10;
