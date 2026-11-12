import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('logo');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporciono ningun archivo' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'El tamano maximo permitido es 2MB' }, { status: 400 });
    }

    // Durante el onboarding el tenant aún no existe: se sube a una carpeta temporal
    // por usuario. Al crear el tenant, saveOnboardingData la mueve a su carpeta.
    // El servicio usa service-role (bypass RLS) para subir el logo de forma segura.
    const fileExt = file.name.split('.').pop() || 'png';
    const uniqueFileName = `onboarding/${userId}/logo-${Date.now()}.${fileExt}`;

    const { data, error } = await getSupabaseServer().storage
      .from('company-logos')
      .upload(uniqueFileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
        metadata: {
          userId: userId,
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      });

    if (error) {
      console.error('Error subiendo logo en onboarding a Supabase Storage:', error);
      return NextResponse.json({
        success: false,
        error: 'Error subiendo logo a Supabase Storage',
        details: error.message
      }, { status: 500 });
    }

    // El bucket es privado: se devuelve una URL firmada para previsualizar
    // y el path para persistir en la BD (logo_url guarda el path).
    const { data: signedUrlData } = await getSupabaseServer().storage
      .from('company-logos')
      .createSignedUrl(uniqueFileName, 3600);

    return NextResponse.json({
      success: true,
      message: 'Logo subido correctamente durante el onboarding',
      logoPath: uniqueFileName,
      logoUrl: signedUrlData?.signedUrl || null,
      fileName: uniqueFileName,
      fileSize: file.size,
      recordId: data.id
    });
  } catch (error) {
    console.error('Error general en POST /api/onboarding/logo-upload:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}