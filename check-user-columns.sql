-- Check User table columns to fix user creation error
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'User' AND table_schema = 'public' 
ORDER BY ordinal_position;
