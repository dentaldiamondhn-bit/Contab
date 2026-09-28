import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

const BUCKET = 'product-photos';
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const productId = (formData.get('productId') as string) || '';
    let tenantId = (formData.get('tenantId') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'Archivo no proporcionado' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede superar 5MB' }, { status: 400 });
    }

    if (tenantId && productId) {
      const { data: prod } = await (getSupabaseServer() as any)
        .from('product')
        .select('tenant_id')
        .eq('id', productId)
        .single();
      if (prod?.tenant_id) tenantId = prod.tenant_id;
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const filePath = `${tenantId}/products/${productId || 'new'}/${timestamp}.${ext}`;

    const { error: uploadError } = await (getSupabaseServer() as any)
      .storage
      .from(BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Product image upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = (getSupabaseServer() as any)
      .storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    if (productId) {
      const { error: updateError } = await (getSupabaseServer() as any)
        .from('product')
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (updateError) {
        console.error('Product image update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ imageUrl, path: filePath });
  } catch (error: any) {
    console.error('POST product image error:', error);
    return NextResponse.json({ error: error?.message || 'Error al subir la imagen' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const productId = searchParams.get('productId');

    if (path) {
      const { error } = await (getSupabaseServer() as any)
        .storage
        .from(BUCKET)
        .remove([path]);

      if (error) {
        console.error('Product image delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (productId) {
      const { error: updateError } = await (getSupabaseServer() as any)
        .from('product')
        .update({ image_url: null, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (updateError) {
        console.error('Product image clear error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE product image error:', error);
    return NextResponse.json({ error: error?.message || 'Error al eliminar la imagen' }, { status: 500 });
  }
}