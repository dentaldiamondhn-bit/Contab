import { NextRequest, NextResponse } from 'next/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { filtroEmpresaOCompany } from '@/lib/company-scope';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

const BUCKET = 'product-photos';
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * Esta ruta no tenia contexto de empresa: el prefijo del archivo salia de
 * `formData.get('tenantId')` (lo manda el cliente) y el `UPDATE` de `product`
 * era `.eq('id', productId)` a secas, o sea un IDOR: cualquier usuario
 * autenticado cambiaba la foto de un producto de otra empresa cambiando el id.
 * El DELETE era peor: `path` venia de la query y borraba cualquier objeto del
 * bucket.
 *
 * Ahora el contexto se valida (403 si la empresa no es del tenant de la sesion),
 * el producto tiene que ser de esa empresa, y el prefijo del almacenamiento sale
 * del tenant resuelto en servidor, no del cuerpo.
 */
export async function POST(request: NextRequest) {
  try {
    const empresa = await contextoDeEmpresa(request);
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Falta el tenant de la empresa' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const productId = (formData.get('productId') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'Archivo no proporcionado' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede superar 5MB' }, { status: 400 });
    }

    // El producto es el padre: tiene que ser de ESTA empresa antes de tocarlo o
    // de escribir bajo su carpeta. Sin esta comprobacion, `productId` bastaba
    // para colgar la imagen de un producto ajeno.
    if (productId) {
      const { data: prod } = await (getSupabaseServer() as any)
        .from('product')
        .select('tenant_id')
        .eq('id', productId)
        .eq('tenant_id', tenantId)
        .match(filtroEmpresaOCompany(empresa))
        .maybeSingle();

      if (!prod) {
        return NextResponse.json(
          { error: 'El producto no pertenece a esta empresa' },
          { status: 404 },
        );
      }
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
        .eq('id', productId)
        .eq('tenant_id', tenantId)
        .match(filtroEmpresaOCompany(empresa));

      if (updateError) {
        console.error('Product image update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ imageUrl, path: filePath });
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('POST product image error:', error);
    return NextResponse.json({ error: error?.message || 'Error al subir la imagen' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const empresa = await contextoDeEmpresa(request);
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Falta el tenant de la empresa' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const productId = searchParams.get('productId');

    if (productId) {
      const { data: prod } = await (getSupabaseServer() as any)
        .from('product')
        .select('id')
        .eq('id', productId)
        .eq('tenant_id', tenantId)
        .match(filtroEmpresaOCompany(empresa))
        .maybeSingle();

      if (!prod) {
        return NextResponse.json(
          { error: 'El producto no pertenece a esta empresa' },
          { status: 404 },
        );
      }
    }

    // `path` lo manda el cliente, asi que se exige que este bajo el prefijo del
    // tenant resuelto en servidor. Sin esto, `?path=` borra cualquier objeto del
    // bucket, tambien de otro tenant.
    const prefijo = `${tenantId}/products/`;
    if (path && !path.startsWith(prefijo)) {
      return NextResponse.json(
        { error: 'La ruta no pertenece a esta empresa' },
        { status: 403 },
      );
    }

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
        .eq('id', productId)
        .eq('tenant_id', tenantId)
        .match(filtroEmpresaOCompany(empresa));

      if (updateError) {
        console.error('Product image clear error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('DELETE product image error:', error);
    return NextResponse.json({ error: error?.message || 'Error al eliminar la imagen' }, { status: 500 });
  }
}