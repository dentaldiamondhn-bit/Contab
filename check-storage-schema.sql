-- Check Supabase Storage schema structure
-- Run this to verify the correct column names

-- Check storage.buckets table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'storage' AND table_name = 'buckets'
ORDER BY ordinal_position;

-- Check storage.objects table structure  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'storage' AND table_name = 'objects'
ORDER BY ordinal_position;

-- Check if storage extension exists
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'uuid-ossp';

-- Check existing buckets
SELECT * FROM storage.buckets;
