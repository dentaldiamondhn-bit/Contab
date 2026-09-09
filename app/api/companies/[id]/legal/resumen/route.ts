import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { cookies } from 'next/headers';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const anioFiscal = searchParams.get('anioFiscal');

    if (!companyId) {
      return NextResponse.json(
        { error: 'CompanyId es requerido' },
        { status: 400 }
      );
    }

    // Ejecutar procedimiento almacenado para obtener resumen por categoría
    const { data: resumen, error } = await supabase
      .rpc('obtener_resumen_categoria', {
        p_company_id: companyId,
        p_anio_fiscal: anioFiscal ? parseInt(anioFiscal) : null,
      });

    if (error) {
      console.error('Error al obtener resumen:', error);
      return NextResponse.json(
        { error: 'Error al obtener resumen de revisiones legales' },
        { status: 500 }
      );
    }

    return NextResponse.json({ resumen });
  } catch (error) {
    console.error('Error en GET /api/companies/[id]/legal/resumen:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
