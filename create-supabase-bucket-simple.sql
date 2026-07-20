-- Create Supabase Storage bucket for company logos (Simplified)
-- Run this in Supabase SQL Editor

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name)
VALUES (
  'company-logos',
  'company-logos'
) ON CONFLICT (id) DO NOTHING;

-- Create Row Level Security policies for the bucket
-- Allow authenticated users to manage their tenant's logos
CREATE POLICY "Users can manage their tenant logos" ON storage.objects
FOR ALL USING (
  bucket_id = 'company-logos' AND
  auth.role() = 'authenticated' AND
  (split_part(name, '/', 1) = auth.jwt() ->> 'tenantId')
);

-- Allow public read access to logos
CREATE POLICY "Public read access to company logos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'company-logos' AND
  public = true
);

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'company-logos';
