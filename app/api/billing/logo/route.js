import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { sessionClaims } = await auth();
    const tenantId = sessionClaims?.tenantId;
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Usuario no asociado a un tenant' }, { status: 404 });
    }

    try {
      console.log('Buscando logo en Supabase Storage para tenant:', tenantId);
      
      const { data, error } = await supabase.storage
        .from('company-logos')
        .list('*', {
          search: `tenantId=eq.${tenantId}`,
          limit: 1
        });

      if (error) {
        console.error('Error buscando logo en Supabase Storage:', error);
        return NextResponse.json({
          success: false,
          logoUrl: null,
          error: 'Error consultando logo en Supabase Storage',
          message: 'No se pudo recuperar el logo'
        });
      }

      if (data && data.length > 0) {
        const logoFile = data[0];
        
        const { data: publicUrlData } = supabase.storage
          .from('company-logos')
          .getPublicUrl(logoFile.name);

        console.log('Logo encontrado en Supabase Storage');
        console.log('Nombre del archivo:', logoFile.name);
        console.log('URL publico:', publicUrlData.publicUrl);

        return NextResponse.json({
          success: true,
          logoUrl: publicUrlData.publicUrl,
          fileName: logoFile.name,
          fileSize: logoFile.metadata?.size,
          fileType: logoFile.metadata?.contentType,
          updatedAt: logoFile.created_at,
          message: 'Logo encontrado en Supabase Storage'
        });
      } else {
        console.log('No hay logo guardado en Supabase Storage para este tenant');

        return NextResponse.json({
          success: true,
          logoUrl: null,
          message: 'No hay logo guardado en Supabase Storage para este tenant'
        });
      }

    } catch (storageError) {
      console.error('Error con Supabase Storage:', storageError);
      return NextResponse.json({
        success: false,
        logoUrl: null,
        error: 'Error con Supabase Storage',
        message: 'No se pudo recuperar el logo'
      });
    }

  } catch (error) {
    console.error('Error obteniendo logo:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { sessionClaims } = await auth();
    const tenantId = sessionClaims?.tenantId;
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Usuario no asociado a un tenant' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('logo');

    if (!file) {
      return NextResponse.json({ error: 'No se proporciono ningun archivo' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'El tamano maximo permitido es 2MB' }, { status: 400 });
    }

    try {
      console.log('Subiendo logo a Supabase Storage para tenant:', tenantId);
      console.log('Nombre del archivo:', file.name);
      console.log('Tamano:', file.size, 'bytes');
      console.log('Tipo:', file.type);

      const fileExt = file.name.split('.').pop();
      const uniqueFileName = `${tenantId}-logo-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('company-logos')
        .upload(uniqueFileName, file, {
          cacheControl: '3600',
          upsert: true,
          metadata: {
            tenantId: tenantId,
            originalName: file.name,
            uploadedAt: new Date().toISOString()
          }
        });

      if (error) {
        console.error('Error subiendo logo a Supabase Storage:', error);
        return NextResponse.json({
          success: false,
          error: 'Error subiendo logo a Supabase Storage',
          details: error.message
        });
      }

      const { data: publicUrlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(uniqueFileName);

      console.log('Logo subido exitosamente a Supabase Storage');
      console.log('ID del registro:', data.id);
      console.log('Nombre unico:', uniqueFileName);
      console.log('URL publico:', publicUrlData.publicUrl);

      return NextResponse.json({
        success: true,
        message: 'Logo subido y guardado correctamente en Supabase Storage',
        logoUrl: publicUrlData.publicUrl,
        fileName: uniqueFileName,
        fileSize: file.size,
        recordId: data.id
      });

    } catch (error) {
      console.error('Error subiendo logo:', error);
      return NextResponse.json({ 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error general en POST:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
