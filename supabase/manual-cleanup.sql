-- Manual Angel Ring Cleanup SQL
-- Run this in your Supabase SQL Editor

-- 1. Find Angel Ring tenants first (to see what we're deleting)
SELECT * FROM Tenant 
WHERE business_name ILIKE '%Angel Ring%' 
   OR id = 'cmofey73w000087izrdfvtlve';

-- 2. Delete users associated with Angel Ring tenants
DELETE FROM "User" 
WHERE tenantid IN (
    SELECT id FROM Tenant 
    WHERE business_name ILIKE '%Angel Ring%' 
       OR id = 'cmofey73w000087izrdfvtlve'
);

-- 3. Delete companies associated with Angel Ring tenants
DELETE FROM companies 
WHERE tenant_id IN (
    SELECT id FROM Tenant 
    WHERE business_name ILIKE '%Angel Ring%' 
       OR id = 'cmofey73w000087izrdfvtlve'
);

-- 4. Delete transactions associated with Angel Ring tenants
DELETE FROM Transaction 
WHERE tenantId IN (
    SELECT id FROM Tenant 
    WHERE business_name ILIKE '%Angel Ring%' 
       OR id = 'cmofey73w000087izrdfvtlve'
);

-- 5. Delete accounts associated with Angel Ring tenants
DELETE FROM Account 
WHERE tenantId IN (
    SELECT id FROM Tenant 
    WHERE business_name ILIKE '%Angel Ring%' 
       OR id = 'cmofey73w000087izrdfvtlve'
);

-- 6. Delete invoices associated with Angel Ring tenants
DELETE FROM invoices 
WHERE tenant_id IN (
    SELECT id FROM Tenant 
    WHERE business_name ILIKE '%Angel Ring%' 
       OR id = 'cmofey73w000087izrdfvtlve'
);

-- 7. Finally delete the Angel Ring tenants
DELETE FROM Tenant 
WHERE business_name ILIKE '%Angel Ring%' 
   OR id = 'cmofey73w000087izrdfvtlve';

-- 8. Verify deletion
SELECT * FROM Tenant 
WHERE business_name ILIKE '%Angel Ring%' 
   OR id = 'cmofey73w000087izrdfvtlve';

-- 9. Check if specific tenant still exists
SELECT * FROM Tenant WHERE id = 'cmofey73w000087izrdfvtlve';

-- 10. Count remaining tenants
SELECT COUNT(*) as total_tenants FROM Tenant;
