-- ULTRA-SIMPLE AUDIT - Only uses columns we know exist
-- No date columns, no complex joins, just basic data

-- =====================================================
-- 1. ALL TENANTS (no date columns)
-- =====================================================
SELECT 
    'ALL TENANTS' as info,
    id, 
    business_name, 
    business_email, 
    is_active
FROM Tenant 
ORDER BY id;

-- =====================================================
-- 2. ANGEL RING SEARCH
-- =====================================================
SELECT 
    'ANGEL RING SEARCH' as info,
    id, 
    business_name, 
    business_email
FROM Tenant 
WHERE business_name ILIKE '%Angel Ring%' 
   OR business_email ILIKE '%scalix%'
   OR id = 'cmofey73w000087izrdfvtlve';

-- =====================================================
-- 3. SPECIFIC TENANT ID CHECK
-- =====================================================
SELECT 
    'SPECIFIC ID CHECK' as info,
    id, 
    business_name, 
    business_email
FROM Tenant 
WHERE id = 'cmofey73w000087izrdfvtlve';

-- =====================================================
-- 4. ALL USERS (no date columns)
-- =====================================================
SELECT 
    'ALL USERS' as info,
    id, 
    email, 
    firstname, 
    lastname,
    tenantid
FROM "User" 
ORDER BY id;

-- =====================================================
-- 5. USERS WITH ANGEL RING TENANT (simple join)
-- =====================================================
SELECT 
    'ANGEL RING USERS' as info,
    u.id, 
    u.email, 
    u.tenantid,
    t.business_name as tenant_name
FROM "User" u
JOIN Tenant t ON u.tenantid = t.id
WHERE t.business_name ILIKE '%Angel Ring%'
   OR u.email ILIKE '%scalix%'
   OR u.tenantid = 'cmofey73w000087izrdfvtlve';

-- =====================================================
-- 6. SIMPLE COUNTS
-- =====================================================
SELECT 
    'SIMPLE COUNTS' as info,
    'Total Tenants' as description,
    COUNT(*) as count
FROM Tenant

UNION ALL

SELECT 
    'SIMPLE COUNTS' as info,
    'Total Users' as description,
    COUNT(*) as count
FROM "User"

UNION ALL

SELECT 
    'SIMPLE COUNTS' as info,
    'Angel Ring Tenants' as description,
    COUNT(*) as count
FROM Tenant 
WHERE business_name ILIKE '%Angel Ring%' 
   OR id = 'cmofey73w000087izrdfvtlve'

UNION ALL

SELECT 
    'SIMPLE COUNTS' as info,
    'Scalix Users' as description,
    COUNT(*) as count
FROM "User" 
WHERE email ILIKE '%scalix%';
