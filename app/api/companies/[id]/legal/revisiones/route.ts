import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const anio = searchParams.get('anio') || '2026';
  
  console.log('🚀 API GET llamado:', `/api/companies/${companyId}/legal/revisiones?anio=${anio}`);
  
  try {
    // Intentar conectar con Supabase
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️  Variables de entorno no configuradas, usando storage global');
      const data = storage.getAll();
      console.log('📦 Storage retornando:', data.length, 'items');
      console.log('📝 Primer item:', data[0]?.titulo);
      return NextResponse.json(data);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Llamar al procedimiento almacenado
    const { data: revisiones, error } = await supabase
      .rpc('obtener_revisiones_legales', {
        p_company_id: companyId,
        p_anio_fiscal: parseInt(anio),
        p_categoria: null,
        p_estado: null,
        p_dias_vencer: null
      });

    if (error) {
      console.error('❌ Error de Supabase:', error);
      console.log('⚠️  Usando storage como fallback');
      const data = storage.getAll();
      return NextResponse.json(data);
    }

    console.log('✅ Datos cargados desde BD:', revisiones?.length || 0, 'revisiones');
    const storageData = storage.getAll();
    console.log('📦 Storage actual:', storageData.length, 'items');
    console.log('📝 Primer item en storage:', storageData[0]?.titulo);
    
    // Si no hay datos en la BD, retornar storage
    if (!revisiones || revisiones.length === 0) {
      console.log('⚠️  No hay datos en BD, usando storage');
      const data = storage.getAll();
      console.log('📤 Retornando storage:', data.map(r => ({id: r.id, titulo: r.titulo})));
      return NextResponse.json(data);
    }

    // Transformar datos de la BD al formato del frontend
    const revisionesFormateadas = revisiones.map((r: any) => ({
      id: r.id,
      categoria: r.categoria,
      titulo: r.titulo,
      descripcion: r.descripcion || '',
      fechaVencimiento: r.fecha_vencimiento,
      estado: r.estado,
      monto: r.monto ? parseFloat(r.monto) : undefined,
      detalles: r.detalles || {},
      contacto: r.contacto || undefined
    }));

    return NextResponse.json(revisionesFormateadas);
  } catch (error) {
    console.error('❌ Error al obtener revisiones:', error);
    console.log('⚠️  Usando storage como fallback debido a error');
    return NextResponse.json(storage.getAll());
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  console.log('🚀 API POST llamado:', `/api/companies/${companyId}/legal/revisiones`);
  
  try {
    const body = await request.json();
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️  Variables de entorno no configuradas, usando storage global');
      
      // Usar storage global
      let result;
      if (body.id) {
        result = storage.update(body.id, body);
        console.log('✅ Storage actualizado:', body.id);
      } else {
        result = storage.create(body);
        console.log('✅ Storage creado:', result.id);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Revisión guardada (storage global)',
        revisionId: result?.id
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Llamar al procedimiento almacenado para guardar
    const { data: revisionId, error } = await supabase
      .rpc('guardar_revision_legal', {
        p_company_id: companyId,
        p_categoria: body.categoria,
        p_titulo: body.titulo,
        p_fecha_vencimiento: body.fechaVencimiento,
        p_descripcion: body.descripcion || null,
        p_estado: body.estado || 'proximo',
        p_monto: body.monto || null,
        p_detalles: body.detalles || null,
        p_contacto: body.contacto || null,
        p_anio_fiscal: parseInt(body.anioFiscal) || 2026,
        p_usuario_id: null,
        p_id: body.id || null
      });

    if (error) {
      console.error('❌ Error al guardar en BD:', error);
      console.log('⚠️  Fallback a storage debido a error');
      
      // Fallback a storage
      let result;
      if (body.id) {
        result = storage.update(body.id, body);
      } else {
        result = storage.create(body);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Revisión guardada (storage fallback)',
        revisionId: result?.id
      });
    }

    console.log('✅ Revisión guardada en BD con ID:', revisionId);
    
    return NextResponse.json({
      success: true,
      message: 'Revisión guardada exitosamente',
      revisionId
    });
  } catch (error) {
    console.error('❌ Error en POST:', error);
    return NextResponse.json(
      { error: 'Error al procesar solicitud', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
