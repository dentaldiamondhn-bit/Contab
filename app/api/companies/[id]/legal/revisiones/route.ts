import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const anio = searchParams.get('anio') || String(new Date().getFullYear());
  
  try {
    // Sin variables de entorno: no hay datos reales disponibles
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️ Variables de entorno no configuradas, sin datos disponibles');
      return NextResponse.json([]);
    }

    // Llamar al procedimiento almacenado
    const { data: revisiones, error } = await getSupabaseServer()
      .rpc('obtener_revisiones_legales', {
        p_company_id: companyId,
        p_anio_fiscal: parseInt(anio),
        p_categoria: null,
        p_estado: null,
        p_dias_vencer: null
      });

    if (error) {
      console.error('❌ Error de Supabase:', error);
      return NextResponse.json([]);
    }

    if (!revisiones || revisiones.length === 0) {
      return NextResponse.json([]);
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
    return NextResponse.json([]);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  
  try {
    const body = await request.json();

    // Sin variables de entorno: no se puede guardar
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'El almacenamiento en base de datos no está configurado. No se pudo guardar la revisión legal.' },
        { status: 500 }
      );
    }

    // Llamar al procedimiento almacenado para guardar
    const { data: revisionId, error } = await getSupabaseServer()
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
        p_anio_fiscal: parseInt(body.anioFiscal) || new Date().getFullYear(),
        p_usuario_id: null,
        p_id: body.id || null
      });

    if (error) {
      console.error('❌ Error al guardar en BD:', error);
      return NextResponse.json(
        { error: 'Error al guardar la revisión legal en la base de datos' },
        { status: 500 }
      );
    }

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