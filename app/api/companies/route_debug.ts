import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  console.log('DEBUG: PUT request received');
  
  try {
    const body = await request.json();
    console.log('DEBUG: Request body:', JSON.stringify(body, null, 2));
    
    // Simple response without database operations
    return NextResponse.json({ 
      message: 'PUT received successfully',
      received: body 
    });
    
  } catch (error) {
    console.error('DEBUG: Error in PUT:', error);
    return NextResponse.json({ 
      error: 'Error processing request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  console.log('DEBUG: GET request received');
  
  try {
    // Simple response without database operations
    return NextResponse.json({ 
      companies: [
        {
          id: 1,
          business_name: 'Dental Diamond',
          business_rtn: '08011999012345',
          industry: 'Servicios Médicos',
          regimen_tributario: 'Régimen General',
          actividad_economica: 'Servicios Médicos',
          direccion_fiscal: 'Colonia Palmira, Tegucigalpa',
          telefono_fiscal: '+504 2234-5678',
          email_fiscal: 'contacto@dentaldiamond.hn',
          is_active: true,
          created_at: '2024-01-15T10:30:00Z',
          config_fiscal: null,
        }
      ]
    });
    
  } catch (error) {
    console.error('DEBUG: Error in GET:', error);
    return NextResponse.json({ 
      error: 'Error processing request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
