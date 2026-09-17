-- Single query with UNION ALL to get all column results
-- This will show us all columns in one result set

SELECT 'Testing id' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'id') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing business_name' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'business_name') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing business_address' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'business_address') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing business_email' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'business_email') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing business_rtn' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'business_rtn') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing tenant_code' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'tenant_code') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing modules' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'modules') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing max_storage' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'max_storage') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing max_transactions' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'max_transactions') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing monthly_cost' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'monthly_cost') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing created_at' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'created_at') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing updated_at' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'updated_at') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing logo_url' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'logo_url') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing phone_number' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'phone_number') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing is_active' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'is_active') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing subscription_plan' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'subscription_plan') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

UNION ALL

SELECT 'Testing max_users' as test, CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'max_users') 
    THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as result

ORDER BY test;
