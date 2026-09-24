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

    // CAIs reales desde la base de datos (tabla cai vía Prisma)
    const cais = await (db as any).cAI.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });

    // Formatear para el frontend
    const formattedCais = (cais || []).map((cai: any) => ({
      id: cai.id,
      cai: cai.cai,
      rangeStart: Number(cai.rangeStart),
      rangeEnd: Number(cai.rangeEnd),
      currentNumber: Number(cai.currentNumber),
      expiryDate: cai.expiryDate ? new Date(cai.expiryDate).toISOString().split('T')[0] : '',
      isActive: cai.isActive,
      establishmentCode: '',
      pointOfSaleCode: '',
      economicActivity: '',
      issueDate: cai.issueDate ? new Date(cai.issueDate).toISOString().split('T')[0] : '',
      createdAt: cai.createdAt,
      updatedAt: cai.updatedAt
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

    const user = await currentUser();
    const tenantId = user?.publicMetadata?.tenantId || user?.privateMetadata?.tenantId;
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Usuario no asociado a un tenant' }, { status: 404 });
    }

    const body = await request.json();
    
    const { 
      cai, 
      rangeStart, 
      rangeEnd, 
      currentNumber, 
      expiryDate,
      isActive = true
    } = body;

    // Validación básica
    if (!cai || !rangeStart || !rangeEnd || !expiryDate) {
      return NextResponse.json({ 
        error: 'CAI, rangos y fecha de vencimiento son obligatorios' 
      }, { status: 400 });
    }

    // Validar que el rango sea válido
    if (Number(rangeStart) >= Number(rangeEnd)) {
      return NextResponse.json({ 
        error: 'El rango inicial debe ser menor al rango final' 
      }, { status: 400 });
    }

    // Validar longitud del CAI (entre 32 y 37 caracteres según diferentes formatos)
    if (cai.length < 32 || cai.length > 37) {
      return NextResponse.json({ 
        error: `El CAI debe tener entre 32 y 37 caracteres (tiene ${cai.length})` 
      }, { status: 400 });
    }

    // Verificar si el CAI ya existe para el tenant
    const existingCai = await (db as any).cAI.findFirst({
      where: { cai: cai, tenantId: tenantId }
    });
    if (existingCai) {
      return NextResponse.json({ 
        error: 'Este CAI ya existe para el tenant actual' 
      }, { status: 400 });
    }

    // Crear CAI real en la base de datos
    const newCai = await (db as any).cAI.create({
      data: {
        tenantId: tenantId,
        cai: cai,
        rangeStart: BigInt(Number(rangeStart)),
        rangeEnd: BigInt(Number(rangeEnd)),
        currentNumber: BigInt(Number(currentNumber || rangeStart)),
        issueDate: new Date(),
        expiryDate: new Date(expiryDate),
        isActive: isActive !== false
      }
    });

    // Formatear respuesta para el frontend
    const responseCai = {
      id: newCai.id,
      cai: newCai.cai,
      rangeStart: Number(newCai.rangeStart),
      rangeEnd: Number(newCai.rangeEnd),
      currentNumber: Number(newCai.currentNumber),
      expiryDate: newCai.expiryDate ? new Date(newCai.expiryDate).toISOString().split('T')[0] : '',
      isActive: newCai.isActive,
      establishmentCode: '',
      pointOfSaleCode: '',
      economicActivity: '',
      issueDate: newCai.issueDate ? new Date(newCai.issueDate).toISOString().split('T')[0] : '',
      createdAt: newCai.createdAt,
      updatedAt: newCai.updatedAt
    };

    return NextResponse.json({
      success: true,
      data: responseCai,
      message: 'CAI creado correctamente'
    });

  } catch (error) {
    console.error('Error creando CAI:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}