-- DROP AND RECREATE FK CONSTRAINT FOR COMPANIES TABLE
-- Run this in Supabase SQL Editor

-- 1. Drop the existing incorrect FK
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_tenant_id_fkey;

-- 2. Recreate FK pointing to correct "Tenant" table
ALTER TABLE companies 
ADD CONSTRAINT companies_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) ON DELETE CASCADE;

-- Verify the fix
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
