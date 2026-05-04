import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener tenantId de Clerk metadata
    const user = await auth();
    const tenantId = user?.publicMetadata?.tenantId || user?.privateMetadata?.tenantId;
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Usuario no asociado a un tenant' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'El tamaño máximo permitido es 2MB' }, { status: 400 });
    }

    // Convertir a base64 para almacenamiento temporal
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Guardar en localStorage simulado (en producción usarías un storage real)
    // Como solución temporal, guardamos en memoria o retornamos el dataUrl
    
    console.log('✅ Logo procesado para tenant:', tenantId);
    console.log('🔍 Tamaño del archivo:', file.size, 'bytes');
    console.log('🔍 Tipo de archivo:', file.type);

    return NextResponse.json({
      success: true,
      message: 'Logo subido correctamente',
      logoUrl: dataUrl,
      fileName: file.name,
      fileSize: file.size
    });

  } catch (error) {
    console.error('Error subiendo logo:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
