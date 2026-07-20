-- Create Supabase Storage bucket for company logos
-- Run this in Supabase SQL Editor

-- Enable storage extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Create Row Level Security policies for the bucket
-- 1. Allow users to upload their own tenant's logo
CREATE POLICY "Users can upload their tenant logo" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-logos' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name)[1] = auth.jwt() ->> 'tenantId')
);

-- 2. Allow users to read their own tenant's logo
CREATE POLICY "Users can read their tenant logo" ON storage.objects
FOR SELECT USING (
  bucket_id = 'company-logos' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name)[1] = auth.jwt() ->> 'tenantId')
);

-- 3. Allow users to update their own tenant's logo
CREATE POLICY "Users can update their tenant logo" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'company-logos' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name)[1] = auth.jwt() ->> 'tenantId')
);

-- 4. Allow users to delete their own tenant's logo
CREATE POLICY "Users can delete their tenant logo" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-logos' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name)[1] = auth.jwt() ->> 'tenantId')
);

-- Grant public access to read logos (for invoice display)
CREATE POLICY "Public read access to company logos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'company-logos' AND
  public = true
);

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'company-logos';
