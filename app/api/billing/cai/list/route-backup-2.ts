import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

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

    // USAR SQL DIRECTO con tagged template literals (sin configuración RLS)
    const result = await (db as any).$queryRaw`
      SELECT 
        id,
        cai,
        start_number as "rangeStart",
        end_number as "rangeEnd", 
        current_number as "currentNumber",
        expiration_date as "expiryDate",
        status as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM "cai" 
      WHERE tenant_id = ${tenantId} 
      ORDER BY created_at DESC
    `;
    
    // Mapear a formato esperado por el frontend
    const formattedCais = result.map((cai: any) => ({
      id: cai.id,
      cai: cai.cai,
      rangeStart: Number(cai.rangeStart),
      rangeEnd: Number(cai.rangeEnd),
      currentNumber: Number(cai.currentNumber),
      expiryDate: cai.expiryDate ? cai.expiryDate.toISOString().split('T')[0] : '',
      isActive: cai.isActive === 'true' || cai.isActive === true,
      // Campos adicionales
      establishmentCode: '001',
      pointOfSaleCode: '001',
      economicActivity: 'Servicios de software',
    }));

    return NextResponse.json({
      success: true,
      data: formattedCais
    });

  } catch (error) {
    console.error('Error obteniendo CAIs:', error);
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
    console.log('🔍 Datos recibidos en API:', body);
    
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

    console.log('🔍 Datos extraídos:', { cai, rangeStart, rangeEnd, currentNumber, expiryDate });
    console.log('🔍 Longitud del CAI:', cai ? cai.length : 'undefined');

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

    try {
      // USAR SQL DIRECTO con tagged template literals (sin configuración RLS)
      const result = await (db as any).$queryRaw`
        INSERT INTO "cai" (
          id,
          cai,
          start_number,
          end_number,
          current_number,
          issue_date,
          expiration_date,
          status,
          tenant_id,
          created_at,
          updated_at
        ) VALUES (
          uuid_generate_v4(),
          ${cai},
          ${rangeStart}::bigint,
          ${rangeEnd}::bigint,
          ${currentNumber || rangeStart}::bigint,
          CURRENT_DATE,
          ${expiryDate}::date,
          'true',
          ${tenantId},
          NOW(),
          NOW()
        )
        RETURNING 
          id,
          cai,
          start_number as "rangeStart",
          end_number as "rangeEnd",
          current_number as "currentNumber",
          expiration_date as "expiryDate",
          status as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const newCai = result[0];

      // Formatear respuesta
      const responseCai = {
        id: newCai.id,
        cai: newCai.cai,
        rangeStart: Number(newCai.rangeStart),
        rangeEnd: Number(newCai.rangeEnd),
        currentNumber: Number(newCai.currentNumber),
        expiryDate: newCai.expiryDate ? newCai.expiryDate.toISOString().split('T')[0] : '',
        isActive: newCai.isActive === 'true' || newCai.isActive === true,
        establishmentCode,
        pointOfSaleCode,
        economicActivity,
      };

      return NextResponse.json({
        success: true,
        data: responseCai,
        message: 'CAI creado correctamente'
      });

    } catch (insertError) {
      console.error('Error creando CAI:', insertError);
      return NextResponse.json({ 
        error: 'Error interno del servidor',
        details: insertError instanceof Error ? insertError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error general en la API:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
