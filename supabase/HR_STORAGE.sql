-- ========================================
-- HR: ALMACENAMIENTO DE FOTOS Y DOCUMENTOS
-- ========================================
-- Ejecutar en Supabase Dashboard -> SQL Editor

-- Crear buckets de almacenamiento
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('employee-photos', 'employee-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('employee-documents', 'employee-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- RLS Policies para employee-photos (público para lectura)
DROP POLICY IF EXISTS "tenant_read_photos" ON storage.objects;
DROP POLICY IF EXISTS "tenant_insert_photos" ON storage.objects;
DROP POLICY IF EXISTS "tenant_update_photos" ON storage.objects;
DROP POLICY IF EXISTS "tenant_delete_photos" ON storage.objects;

CREATE POLICY "tenant_read_photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'employee-photos'
  );

CREATE POLICY "tenant_insert_photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'employee-photos'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

CREATE POLICY "tenant_update_photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'employee-photos'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

CREATE POLICY "tenant_delete_photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'employee-photos'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

-- RLS Policies para employee-documents (solo tenant owner)
CREATE POLICY "tenant_read_documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

CREATE POLICY "tenant_insert_documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

CREATE POLICY "tenant_update_documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

CREATE POLICY "tenant_delete_documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );

-- Service role bypass (para API routes)
CREATE POLICY "service_role_all_photos" ON storage.objects
  FOR ALL USING (auth.role() = 'service_role' AND bucket_id = 'employee-photos');

CREATE POLICY "service_role_all_documents" ON storage.objects
  FOR ALL USING (auth.role() = 'service_role' AND bucket_id = 'employee-documents');
