-- Storage bucket for product photos (public for viewing)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-photos',
  'product-photos',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload / replace / delete product photos
CREATE POLICY "Authenticated users can upload product photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-photos' AND auth.role() = 'authenticated');

-- Authenticated users can update product photos (upsert)
CREATE POLICY "Authenticated users can update product photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-photos' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'product-photos' AND auth.role() = 'authenticated');

-- Anyone can view product photos (public bucket URLs)
CREATE POLICY "Public read access to product photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-photos');

-- Authenticated users can delete product photos
CREATE POLICY "Authenticated users can delete product photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-photos' AND auth.role() = 'authenticated');