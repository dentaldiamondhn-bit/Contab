-- Check if id column has primary key constraint
-- If not, add it to fix the ON CONFLICT error

-- 1. Check current constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
     ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'Tenant' AND tc.table_schema = 'public'
ORDER BY tc.constraint_name;

-- 2. If no primary key exists, add one
-- (This will fix the ON CONFLICT error)
ALTER TABLE Tenant ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);

-- 3. Verify primary key was added
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
     ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'Tenant' AND tc.table_schema = 'public'
  AND tc.constraint_type = 'PRIMARY KEY';
