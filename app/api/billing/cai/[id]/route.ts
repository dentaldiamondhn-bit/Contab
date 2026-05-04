import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Primero obtener el tenant asociado al usuario
    const user = await (db as any).user.findUnique({
      where: { id: userId },
      select: { tenantid: true }
    });

    if (!user || !user.tenantid) {
      return NextResponse.json({ error: 'Usuario no asociado a un tenant' }, { status: 404 });
    }

    const { id } = params;
    const body = await request.json();
    const { 
      cai, 
      start_number: true,
      end_number: true,
      current_number: true,
      expiration_date: true,
      status: true,
      establishmentCode = '001',
      pointOfSaleCode = '001',
      economicActivity = 'Servicios de software',
      isActive = true
    } = body;

    // Validar que el CAI exista y pertenezca al tenant
    const existingCai = await (db as any).cAI.findFirst({
      where: { 
        id: id,
        tenantid: user.tenantid 
      }
    });

    if (!existingCai) {
      return NextResponse.json({ 
        error: 'CAI no encontrado o no pertenece a este tenant' 
      }, { status: 404 });
    }

    // Validación básica
    if (!cai || !cai.start_number || !cai.end_number || !cai.expiration_date) {
      return NextResponse.json({ 
        error: 'CAI, rango y fecha de vencimiento son obligatorios' 
      }, { status: 400 });
    }

    // Validar que el rango sea válido
    if (cai.start_number >= cai.end_number) {
      return NextResponse.json({ 
        error: 'El rango inicial debe ser menor al rango final' 
      }, { status: 400 });
    }

    // Validar que el número actual esté dentro del rango
    if (cai.current_number < cai.start_number || cai.current_number > cai.end_number) {
      return NextResponse.json({ 
        error: 'El número actual debe estar dentro del rango especificado' 
      }, { status: 400 });
    }

    // Actualizar CAI
    const updatedCai = await (db as any).cAI.update({
      where: { id: id },
      data: {
        cai: cai.cai,
        start_number: cai.start_number,
        end_number: cai.end_number,
        current_number: cai.current_number,
        expiration_date: new Date(cai.expiration_date),
        status: cai.status,
        created_at: existingCai.created_at,
        updated_at: new Date(),
      }
    });

    // Formatear respuesta
    const responseCai = {
      id: updatedCai.id,
      cai: cai.cai,
      rangeStart: Number(cai.start_number),
      rangeEnd: Number(cai.end_number),
      currentNumber: Number(cai.current_number),
      expiryDate: cai.expiration_date.toISOString().split('T')[0],
      isActive: cai.status,
      establishmentCode,
      pointOfSaleCode,
      economicActivity,
    };

    return NextResponse.json({
      success: true,
      data: responseCai,
      message: 'CAI actualizado correctamente'
    });

  } catch (error) {
    console.error('Error actualizando CAI:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Primero obtener el tenant asociado al usuario
    const user = await (db as any).user.findUnique({
      where: { id: userId },
      select: { tenantid: true }
    });

    if (!user || !user.tenantid) {
      return NextResponse.json({ error: 'Usuario no asociado a un tenant' }, { status: 404 });
    }

    const { id } = params;

    // Validar que el CAI exista y pertenezca al tenant
    const existingCai = await (db as any).cAI.findFirst({
      where: { 
        id: id,
        tenantid: user.tenantid 
      }
    });

    if (!existingCai) {
      return NextResponse.json({ 
        error: 'CAI no encontrado o no pertenece a este tenant' 
      }, { status: 404 });
    }

    // Verificar que no hay facturas asociadas a este CAI
    const invoicesCount = await (db as any).invoice.count({
      where: { 
        caiId: id 
      }
    });

    if (invoicesCount > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar un CAI que tiene facturas asociadas' 
      }, { status: 400 });
    }

    // Eliminar CAI
    await (db as any).cAI.delete({
      where: { id: id }
    });

    return NextResponse.json({
      success: true,
      message: 'CAI eliminado correctamente'
    });

  } catch (error) {
    console.error('Error eliminando CAI:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
