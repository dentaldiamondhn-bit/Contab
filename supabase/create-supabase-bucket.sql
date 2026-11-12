-- Create Supabase Storage bucket for company logos
-- Bucket PRIVADO: los logos se muestran mediante URLs firmadas (signed URLs)
-- Aislamiento por tenant: cada archivo vive en una carpeta con el tenantId:
--   - Billing:  {tenantId}/logo-*.{ext}
--   - Onboarding temporal: onboarding/{userId}/logo-*.{ext} (se mueve al crear el tenant)
-- Run this in Supabase SQL Editor

-- Enable storage extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create storage bucket for company logos (PRIVADO)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  false,
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if present (permite re-ejecutar el script)
DROP POLICY IF EXISTS "Users can upload their tenant logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their tenant logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their tenant logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their tenant logo" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to company logos" ON storage.objects;

-- Los uploads durante el onboarding (carpeta onboarding/{userId}) se hacen con
-- service-role (bypass RLS). Las políticas de abajo aíslan por tenantId.

-- 1. Allow users to upload inside their own tenant folder
CREATE POLICY "Users can upload their tenant logo" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-logos' AND
  auth.role() = 'authenticated' AND
  split_part(name, '/', 1) = (auth.jwt() ->> 'tenantId')
);

-- 2. Allow users to read files inside their own tenant folder
CREATE POLICY "Users can read their tenant logo" ON storage.objects
FOR SELECT USING (
  bucket_id = 'company-logos' AND
  auth.role() = 'authenticated' AND
  split_part(name, '/', 1) = (auth.jwt() ->> 'tenantId')
);

-- 3. Allow users to update files inside their own tenant folder
CREATE POLICY "Users can update their tenant logo" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'company-logos' AND
  auth.role() = 'authenticated' AND
  split_part(name, '/', 1) = (auth.jwt() ->> 'tenantId')
);

-- 4. Allow users to delete files inside their own tenant folder
CREATE POLICY "Users can delete their tenant logo" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-logos' AND
  auth.role() = 'authenticated' AND
  split_part(name, '/', 1) = (auth.jwt() ->> 'tenantId')
);

-- Verify bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id = 'company-logos';