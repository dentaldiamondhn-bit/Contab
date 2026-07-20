import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Talonarios GET request started');
    
    // Crear cliente directo con service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const directSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Obtener el ID de la empresa de los parámetros de búsqueda
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    console.log('API: Fetching Talonarios for company:', companyId);

    let query = directSupabase
      .from('talonarios')
      .select('*')
      .order('created_at', { ascending: false });

    // Si hay company_id, filtrar por empresa
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: talonarios, error } = await query;

    if (error) {
      console.error('API: Error fetching Talonarios:', error);
      return NextResponse.json(
        { error: 'Error fetching Talonarios', details: error.message },
        { status: 500 }
      );
    }

    console.log('API: Talonarios fetched successfully:', talonarios?.length || 0);
    
    return NextResponse.json({ 
      success: true, 
      talonarios: talonarios || [],
      count: talonarios?.length || 0
    });

  } catch (error) {
    console.error('API: Unexpected error in Talonarios GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('API: Talonarios POST request started');
    
    const body = await request.json();
    console.log('API: Talonarios request body:', body);

    // Crear cliente directo con service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const directSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Validar campos requeridos
    const requiredFields = ['cai_id', 'company_id', 'cantidad_recibos', 'fecha_vencimiento'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      console.log('API: Missing required fields:', missingFields);
      return NextResponse.json(
        { error: 'Missing required fields', details: missingFields },
        { status: 400 }
      );
    }

    // Generar número de talonario
    const talonarioNumber = `TAL-${Date.now()}`;

    // Insertar nuevo Talonario
    const { data: newTalonario, error } = await directSupabase
      .from('talonarios')
      .insert({
        cai_id: body.cai_id,
        company_id: body.company_id,
        numero_talonario: talonarioNumber,
        fecha_solicitud: new Date().toISOString().split('T')[0],
        fecha_vencimiento: body.fecha_vencimiento,
        cantidad_recibos: body.cantidad_recibos,
        recibos_utilizados: 0,
        recibos_disponibles: body.cantidad_recibos,
        estado: 'activo',
        current_correlative: 1,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('API: Error creating Talonario:', error);
      return NextResponse.json(
        { error: 'Error creating Talonario', details: error.message },
        { status: 500 }
      );
    }

    console.log('API: Talonario created successfully:', newTalonario);
    
    return NextResponse.json({ 
      success: true, 
      talonario: newTalonario,
      message: 'Talonario creado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('API: Unexpected error in Talonarios POST:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
