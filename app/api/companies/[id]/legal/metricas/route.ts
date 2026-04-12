import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Cookie: cookieStore.toString() },
      },
    });

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const anioFiscal = searchParams.get('anioFiscal');

    if (!companyId) {
      return NextResponse.json(
        { error: 'CompanyId es requerido' },
        { status: 400 }
      );
    }

    // Ejecutar procedimiento almacenado para obtener métricas del dashboard
    const { data: metricas, error } = await supabase
      .rpc('obtener_metricas_dashboard', {
        p_company_id: companyId,
        p_anio_fiscal: anioFiscal ? parseInt(anioFiscal) : null,
      });

    if (error) {
      console.error('Error al obtener métricas:', error);
      return NextResponse.json(
        { error: 'Error al obtener métricas del dashboard legal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ metricas });
  } catch (error) {
    console.error('Error en GET /api/companies/[id]/legal/metricas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
