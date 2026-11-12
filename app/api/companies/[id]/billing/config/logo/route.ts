import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { resolveTenant } from '@/lib/services/budget-service';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

// POST /api/companies/[id]/billing/config/logo  (FormData: logo)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: companyId } = await params;
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId es requerido' }, { status: 400 });
    }
    const supabase = getSupabaseServer();
    const tenantId = await resolveTenant(companyId, tenantHint(request));

    const formData = await request.formData();
    const file = formData.get('logo');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }
    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'El archivo debe ser una imagen' }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'El tamaño máximo permitido es 2MB' }, { status: 400 });
    }

    const fileExt = file.name?.split('.').pop() || 'png';
    const logoPath = `${tenantId}/logo-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage.from('company-logos').upload(logoPath, file, {
      cacheControl: '3600',
      upsert: true,
      metadata: { tenantId, originalName: file.name, uploadedAt: new Date().toISOString() },
    });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const { data: signedData } = await supabase.storage
      .from('company-logos')
      .createSignedUrl(logoPath, 3600);

    return NextResponse.json({
      success: true,
      logoPath,
      logoUrl: signedData?.signedUrl || null,
      fileName: logoPath,
      message: 'Logo subido correctamente',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    console.error('Error uploading logo:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}