import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Cookie: cookieStore.toString() },
      },
    });

    const body = await request.json();
    const { accionId, notas } = body;

    if (!accionId) {
      return NextResponse.json(
        { error: 'ID de acción es requerido' },
        { status: 400 }
      );
    }

    // Ejecutar procedimiento almacenado para completar acción
    const { data, error } = await supabase
      .rpc('completar_accion_revision', {
        p_accion_id: accionId,
        p_usuario_id: null, // TODO: Obtener del contexto de autenticación
        p_notas: notas,
      });

    if (error) {
      console.error('Error al completar acción:', error);
      return NextResponse.json(
        { error: 'Error al completar acción', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: data,
      message: 'Acción completada exitosamente',
    });
  } catch (error) {
    console.error('Error en POST /api/companies/[id]/legal/acciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
