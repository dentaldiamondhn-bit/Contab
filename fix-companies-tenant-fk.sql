-- Fix companies table foreign key constraint
-- The FK references 'tenant' table but we insert into 'Tenant' table

-- 1. Check current FK constraint on companies table
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'companies';

-- 2. Check if lowercase 'tenant' table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('tenant', 'Tenant', 'tenants', 'Tenants');

-- 3. If FK references 'tenant' but data is in 'Tenant', we need to either:
--    a) Create a view 'tenant' that references 'Tenant', OR
--    b) Drop and recreate the FK to reference 'Tenant'

-- Option B: Fix the FK constraint (run this if needed)
-- First, drop the existing FK
-- ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_tenant_id_fkey;

-- Then recreate it pointing to the correct table
-- ALTER TABLE companies 
-- ADD CONSTRAINT companies_tenant_id_fkey 
-- FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) ON DELETE CASCADE;
