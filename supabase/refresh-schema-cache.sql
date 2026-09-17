-- Refresh Supabase schema cache by running a simple query
-- This should help resolve the "column not found in schema cache" issue

-- 1. Simple select to refresh cache
SELECT COUNT(*) as total_tenants FROM Tenant;

-- 2. Test insert with minimal columns to verify schema cache
-- This will help ensure the schema is properly loaded
INSERT INTO Tenant (id, business_name, businessname, created_at, createdat)
VALUES ('SCHEMA-TEST', 'Schema Test', 'Schema Test', NOW(), NOW())
RETURNING id, business_name, businessname;

-- 3. Clean up test record
DELETE FROM Tenant WHERE id = 'SCHEMA-TEST';

-- 4. Verify all our target columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Tenant' AND table_schema = 'public' 
AND column_name IN ('tenantcode', 'subscriptionplan', 'maxusers', 'maxstorage', 'maxtransactions', 'monthlycost', 'isactive', 'createdat', 'updatedat', 'logourl', 'phonenumber')
ORDER BY column_name;
