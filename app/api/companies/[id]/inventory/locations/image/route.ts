import { NextRequest, NextResponse } from 'next/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { isLocationMigrationMissingError } from '@/lib/services/location-service';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

const BUCKET = 'product-photos';
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * Esta ruta no tenia contexto de empresa: el tenant salia de
 * `formData.get('tenantId')` / `?tenantId` (lo manda el cliente) y el `UPDATE`
 * de `product_location` era `.eq('id', locationId).eq('tenant_id', tenantId)` a
 * secas, o sea un IDOR: dentro de un tenant compartido (`TEST1DS`) un id de la
 * empresa hermana se podia reescribir sin error.
 *
 * Ahora el contexto se valida contra el `[id]` de la ruta (403 si la empresa no
 * es del tenant de la sesion), el estante tiene que ser de esa empresa y el
 * prefijo del almacenamiento sale del tenant resuelto en servidor, no del
 * cuerpo. El filtro de empresa usa la misma convencion que `location-service`
 * (`company_id.eq.X OR company_id.is.null`, las filas con empresa NULL son
 * validas y visibles para todas las empresas del tenant).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: companyId } = await params;
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyId });
    const tenantId = empresa.tenantId;
    if (!tenantId || !empresa.companyId) {
      return NextResponse.json({ error: 'Falta el tenant de la empresa' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const locationId = (formData.get('locationId') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'Archivo no proporcionado' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede superar 5MB' }, { status: 400 });
    }

    // El estante es el destinatario: tiene que ser de ESTA empresa antes de
    // tocarlo o de escribir bajo su carpeta. Sin esto, `locationId` bastaba
    // para colgar la imagen de un estante ajeno.
    if (locationId) {
      const { data: loc } = await (getSupabaseServer() as any)
        .from('product_location')
        .select('id')
        .eq('id', locationId)
        .eq('tenant_id', tenantId)
        .or(`company_id.eq.${empresa.companyId},company_id.is.null`)
        .maybeSingle();

      if (!loc) {
        return NextResponse.json(
          { error: 'La ubicación no pertenece a esta empresa' },
          { status: 404 },
        );
      }
    }

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
        .eq('tenant_id', tenantId)
        .or(`company_id.eq.${empresa.companyId},company_id.is.null`);
      if (updateError) {
        if (isLocationMigrationMissingError(updateError)) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
        console.error('Location image update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ imageUrl, path: filePath });
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
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
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyId });
    const tenantId = empresa.tenantId;
    if (!tenantId || !empresa.companyId) {
      return NextResponse.json({ error: 'Falta el tenant de la empresa' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const locationId = searchParams.get('locationId');

    if (locationId) {
      const { data: loc } = await (getSupabaseServer() as any)
        .from('product_location')
        .select('id')
        .eq('id', locationId)
        .eq('tenant_id', tenantId)
        .or(`company_id.eq.${empresa.companyId},company_id.is.null`)
        .maybeSingle();

      if (!loc) {
        return NextResponse.json(
          { error: 'La ubicación no pertenece a esta empresa' },
          { status: 404 },
        );
      }
    }

    // `path` lo manda el cliente, asi que se exige que este bajo el prefijo del
    // tenant resuelto en servidor. Sin esto, `?path=` borra cualquier objeto
    // del bucket, tambien de otro tenant.
    const prefijo = `${tenantId}/locations/`;
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
        console.error('Location image delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (locationId) {
      const { error: updateError } = await (getSupabaseServer() as any)
        .from('product_location')
        .update({ image_url: null, updated_at: new Date().toISOString() })
        .eq('id', locationId)
        .eq('tenant_id', tenantId)
        .or(`company_id.eq.${empresa.companyId},company_id.is.null`);
      if (updateError) {
        console.error('Location image clear error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('DELETE location image error:', error);
    return NextResponse.json({ error: error?.message || 'Error al eliminar la imagen' }, { status: 500 });
  }
}