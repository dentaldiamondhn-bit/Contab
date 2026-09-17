-- Get definitive current column list
-- This will show us what columns exist RIGHT NOW

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Tenant' AND table_schema = 'public' 
ORDER BY ordinal_position;
