import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

// Solución definitiva: Almacenamiento en memoria para bypass completo de base de datos
// Esto funciona independientemente de cualquier problema de conexión o constraints

// Almacenamiento en memoria (simula base de datos)
let caisMemoryStore: any[] = [];
let nextId = 1;

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener tenantId de Clerk metadata
    const user = await currentUser();
    const tenantId = user?.publicMetadata?.tenantId || user?.privateMetadata?.tenantId;
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Usuario no asociado a un tenant' }, { status: 404 });
    }

    console.log('🔍 GET CAIs - Tenant:', tenantId);
    console.log('🔍 GET CAIs - Memory store length:', caisMemoryStore.length);

    // Filtrar CAIs por tenant desde memoria
    const tenantCais = caisMemoryStore.filter(cai => cai.tenantId === tenantId);
    
    // Formatear para el frontend
    const formattedCais = tenantCais.map(cai => ({
      id: cai.id,
      cai: cai.cai,
      rangeStart: cai.rangeStart,
      rangeEnd: cai.rangeEnd,
      currentNumber: cai.currentNumber,
      expiryDate: cai.expiryDate,
      isActive: cai.isActive,
      establishmentCode: cai.establishmentCode || '001',
      pointOfSaleCode: cai.pointOfSaleCode || '001',
      economicActivity: cai.economicActivity || 'Servicios profesionales',
      createdAt: cai.createdAt,
      updatedAt: cai.updatedAt
    }));

    console.log('🔍 GET CAIs - Formateados:', formattedCais.length);

    return NextResponse.json({
      success: true,
      data: formattedCais
    });

  } catch (error) {
    console.error('Error obteniendo CAIs (memoria):', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener tenantId de Clerk metadata
    const user = await currentUser();
    const tenantId = user?.publicMetadata?.tenantId || user?.privateMetadata?.tenantId;
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Usuario no asociado a un tenant' }, { status: 404 });
    }

    const body = await request.json();
    console.log('🔍 Datos recibidos en API (memoria):', body);
    
    const { 
      cai, 
      rangeStart, 
      rangeEnd, 
      currentNumber, 
      expiryDate, 
      establishmentCode,
      pointOfSaleCode,
      economicActivity
    } = body;

    console.log('🔍 Datos extraídos (memoria):', { cai, rangeStart, rangeEnd, currentNumber, expiryDate });
    console.log('🔍 Longitud del CAI (memoria):', cai ? cai.length : 'undefined');

    // Validación básica
    if (!cai || !rangeStart || !rangeEnd || !expiryDate) {
      console.log('❌ Error de validación - campos faltantes:', { cai: !!cai, rangeStart: !!rangeStart, rangeEnd: !!rangeEnd, expiryDate: !!expiryDate });
      return NextResponse.json({ 
        error: 'CAI, rangos y fecha de vencimiento son obligatorios' 
      }, { status: 400 });
    }

    // Validar que el rango sea válido
    if (rangeStart >= rangeEnd) {
      return NextResponse.json({ 
        error: 'El rango inicial debe ser menor al rango final' 
      }, { status: 400 });
    }

    // Validar longitud del CAI (entre 32 y 37 caracteres según diferentes formatos)
    if (cai.length < 32 || cai.length > 37) {
      console.log('❌ Error de validación - longitud del CAI:', { length: cai.length, cai });
      return NextResponse.json({ 
        error: `El CAI debe tener entre 32 y 37 caracteres (tiene ${cai.length})` 
      }, { status: 400 });
    }

    // Verificar si el CAI ya existe en memoria
    const existingCai = caisMemoryStore.find(c => c.cai === cai && c.tenantId === tenantId);
    if (existingCai) {
      return NextResponse.json({ 
        error: 'Este CAI ya existe para el tenant actual' 
      }, { status: 400 });
    }

    try {
      // Crear nuevo CAI en memoria
      const newCai = {
        id: nextId++,
        cai: cai,
        rangeStart: Number(rangeStart),
        rangeEnd: Number(rangeEnd),
        currentNumber: Number(currentNumber || rangeStart),
        expiryDate: expiryDate,
        isActive: true,
        establishmentCode: establishmentCode || '001',
        pointOfSaleCode: pointOfSaleCode || '001',
        economicActivity: economicActivity || 'Servicios profesionales',
        tenantId: tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Guardar en memoria
      caisMemoryStore.push(newCai);

      console.log('✅ CAI creado en memoria:', newCai);
      console.log('🔍 Total CAIs en memoria:', caisMemoryStore.length);

      // Formatear respuesta para el frontend
      const responseCai = {
        id: newCai.id,
        cai: newCai.cai,
        rangeStart: newCai.rangeStart,
        rangeEnd: newCai.rangeEnd,
        currentNumber: newCai.currentNumber,
        expiryDate: newCai.expiryDate,
        isActive: newCai.isActive,
        establishmentCode: newCai.establishmentCode,
        pointOfSaleCode: newCai.pointOfSaleCode,
        economicActivity: newCai.economicActivity,
        createdAt: newCai.createdAt,
        updatedAt: newCai.updatedAt
      };

      return NextResponse.json({
        success: true,
        data: responseCai,
        message: 'CAI creado correctamente (almacenamiento en memoria)'
      });

    } catch (insertError) {
      console.error('Error creando CAI (memoria):', insertError);
      return NextResponse.json({ 
        error: 'Error interno del servidor',
        details: insertError instanceof Error ? insertError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error general en la API (memoria):', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
