import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { resolveTenant } from '@/lib/services/budget-service';

const BUCKET = 'product-photos';
const MAX_SIZE = 5 * 1024 * 1024;

// POST /api/companies/[id]/inventory/locations/image   (FormData: file, tenantId, locationId)
// DELETE /api/companies/[id]/inventory/locations/image?path=...&locationId=...
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: companyId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const locationId = (formData.get('locationId') as string) || '';
    const tenantHint = request.headers.get('x-tenant-id') || (formData.get('tenantId') as string) || null;

    if (!file) {
      return NextResponse.json({ error: 'Archivo no proporcionado' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede superar 5MB' }, { status: 400 });
    }

    const tenantId = await resolveTenant(companyId, tenantHint);
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const filePath = `${tenantId}/locations/${locationId || 'new'}/${timestamp}.${ext}`;

    const { error: uploadError } = await (getSupabaseServer() as any)
      .storage
      .from(BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
        cacheControl: '3600',
      });
    if (uploadError) {
      console.error('Location image upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = (getSupabaseServer() as any)
      .storage
      .from(BUCKET)
      .getPublicUrl(filePath);
    const imageUrl = urlData.publicUrl;

    if (locationId) {
      const { error: updateError } = await (getSupabaseServer() as any)
        .from('product_location')
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', locationId)
        .eq('tenant_id', tenantId);
      if (updateError) {
        console.error('Location image update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ imageUrl, path: filePath });
  } catch (error: any) {
    console.error('POST location image error:', error);
    return NextResponse.json({ error: error?.message || 'Error al subir la imagen' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: companyId } = await params;
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const locationId = searchParams.get('locationId');

    if (path) {
      const { error } = await (getSupabaseServer() as any)
        .storage
        .from(BUCKET)
        .remove([path]);
      if (error) {
        console.error('Location image delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (locationId) {
      const tenantId = await resolveTenant(companyId, searchParams.get('tenantId'));
      const { error: updateError } = await (getSupabaseServer() as any)
        .from('product_location')
        .update({ image_url: null, updated_at: new Date().toISOString() })
        .eq('id', locationId)
        .eq('tenant_id', tenantId);
      if (updateError) {
        console.error('Location image clear error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE location image error:', error);
    return NextResponse.json({ error: error?.message || 'Error al eliminar la imagen' }, { status: 500 });
  }
}