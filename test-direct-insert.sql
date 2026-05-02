-- Test direct SQL insert bypassing Supabase client
-- This will help us determine if the issue is with Supabase client or database

-- Test 1: Simple insert with minimal columns
INSERT INTO Tenant (
    id, 
    businessname,
    businessrtn,
    businessemail, 
    businessaddress,
    country,
    timezone,
    currency,
    subscriptionplan,
    maxusers,
    maxstorage,
    maxtransactions,
    monthlycost,
    isactive,
    createdat,
    updatedat,
    business_name,
    business_address,
    subscription_plan,
    max_users,
    is_active,
    tenant_code,
    modules
) VALUES (
    'DIRECT-TEST-001',
    'Direct Test Company',
    '',
    'test@example.com',
    '',
    'HN',
    'America/Tegucigalpa',
    'HNL',
    'BASIC',
    5,
    1000,
    1000,
    0,
    true,
    NOW(),
    NOW(),
    'Direct Test Company',
    '',
    'BASIC',
    5,
    true,
    'DIRECT-TEST-001',
    'basic'
)
ON CONFLICT (id) DO NOTHING
RETURNING id, businessname, createdat;

-- Clean up
-- DELETE FROM Tenant WHERE id = 'DIRECT-TEST-001';
