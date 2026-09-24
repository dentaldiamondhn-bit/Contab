import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase-db';

async function getTenantId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  return user?.publicMetadata?.tenantId || user?.privateMetadata?.tenantId || null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Aceptar campos en camelCase (settings) o snake_case (legacy)
    const {
      cai,
      rangeStart,
      rangeEnd,
      currentNumber,
      expiryDate,
      start_number,
      end_number,
      current_number,
      expiration_date,
      isActive = true,
      status,
    } = body;

    const start = Number(rangeStart ?? start_number);
    const end = Number(rangeEnd ?? end_number);
    const current = Number(currentNumber ?? current_number);
    const exp = expiryDate || expiration_date;

    // Validar que el CAI exista y pertenezca al tenant
    const existingCai = await (db as any).cAI.findFirst({
      where: { 
        id: id,
        tenantId: tenantId 
      }
    });

    if (!existingCai) {
      return NextResponse.json({ 
        error: 'CAI no encontrado o no pertenece a este tenant' 
      }, { status: 404 });
    }

    // Validación básica
    if (!cai || !start || !end || !exp) {
      return NextResponse.json({ 
        error: 'CAI, rango y fecha de vencimiento son obligatorios' 
      }, { status: 400 });
    }

    // Validar que el rango sea válido
    if (start >= end) {
      return NextResponse.json({ 
        error: 'El rango inicial debe ser menor al rango final' 
      }, { status: 400 });
    }

    // Validar que el número actual esté dentro del rango
    if (current < start || current > end) {
      return NextResponse.json({ 
        error: 'El número actual debe estar dentro del rango especificado' 
      }, { status: 400 });
    }

    // Actualizar CAI en la base de datos
    const updatedCai = await (db as any).cAI.update({
      where: { id: id },
      data: {
        cai: cai,
        rangeStart: BigInt(start),
        rangeEnd: BigInt(end),
        currentNumber: BigInt(current),
        expiryDate: new Date(exp),
        isActive: status !== undefined ? Boolean(status) : isActive !== false,
      }
    });

    // Formatear respuesta
    const responseCai = {
      id: updatedCai.id,
      cai: updatedCai.cai,
      rangeStart: Number(updatedCai.rangeStart),
      rangeEnd: Number(updatedCai.rangeEnd),
      currentNumber: Number(updatedCai.currentNumber),
      expiryDate: updatedCai.expiryDate ? new Date(updatedCai.expiryDate).toISOString().split('T')[0] : '',
      isActive: updatedCai.isActive,
      establishmentCode: '',
      pointOfSaleCode: '',
      economicActivity: '',
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
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    // Validar que el CAI exista y pertenezca al tenant
    const existingCai = await (db as any).cAI.findFirst({
      where: { 
        id: id,
        tenantId: tenantId 
      }
    });

    if (!existingCai) {
      return NextResponse.json({ 
        error: 'CAI no encontrado o no pertenece a este tenant' 
      }, { status: 404 });
    }

    // Verificar que no hay facturas asociadas a este CAI
    const { count: invoicesCount } = await (supabase as any)
      .from('Invoice')
      .select('id', { count: 'exact', head: true })
      .eq('cai', existingCai.cai);

    if ((invoicesCount || 0) > 0) {
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