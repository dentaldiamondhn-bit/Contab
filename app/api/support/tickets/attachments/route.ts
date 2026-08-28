import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const ticketId = formData.get('ticketId') as string;

    if (!file || !ticketId) {
      return NextResponse.json({ error: 'Archivo y ticketId requeridos' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo no puede exceder 10MB' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'ticket-attachments');
    if (!bucketExists) {
      await supabase.storage.createBucket('ticket-attachments', {
        public: true,
        fileSizeLimit: 10485760,
        allowedMimeTypes: [
          'image/jpeg','image/png','image/gif','image/webp','application/pdf',
          'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain','application/zip'
        ]
      });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `tickets/${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ticket-attachments')
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError.message, uploadError);
      return NextResponse.json({ error: 'Error subiendo archivo', details: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('ticket-attachments')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      attachment: {
        name: file.name,
        url: urlData.publicUrl,
        size: file.size,
        type: file.type,
        storagePath: fileName
      }
    });
  } catch (error: any) {
    console.error('Error uploading attachment:', error?.message || error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error?.message }, { status: 500 });
  }
}
