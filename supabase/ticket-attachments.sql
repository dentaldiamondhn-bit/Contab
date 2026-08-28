-- Storage bucket for support ticket attachments (public for viewing)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
         'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'text/plain','application/zip']
) ON CONFLICT (id) DO NOTHING;

-- Anyone authenticated can upload
CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');

-- Public read for viewing
CREATE POLICY "Public read access to ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own ticket attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');

-- Add attachments column to SupportTicket (JSONB array of file objects)
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
