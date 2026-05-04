import { NextRequest, NextResponse } from 'next/server';
import { getTenantUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const user = await getTenantUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { tenantId } = params;

    // Solo administradores pueden ver CAI de otros tenants
    if (user.tenantId !== tenantId && user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener CAI activo del tenant
    const activeCai = await (db as any).cAI.findFirst({
      where: { 
        tenantId: tenantId,
        isActive: true 
      },
      orderBy: { 
        createdAt: 'desc' 
      }
    });

    if (!activeCai) {
      return NextResponse.json({
        success: false,
        message: 'El tenant no tiene CAI activo configurado'
      }, { status: 404 });
    }

    // Formatear respuesta
    const caiInfo = {
      id: activeCai.id,
      cai: activeCai.cai,
      rangeStart: Number(activeCai.rangeStart),
      rangeEnd: Number(activeCai.rangeEnd),
      currentNumber: Number(activeCai.currentNumber),
      expiryDate: activeCai.expiryDate.toISOString().split('T')[0],
      isActive: activeCai.isActive,
      // Valores por defecto, podrían venir de configuración adicional
      establishmentCode: '001',
      pointOfSaleCode: '001',
      economicActivity: 'Servicios de software',
    };

    return NextResponse.json({
      success: true,
      cai: caiInfo
    });

  } catch (error) {
    console.error('Error obteniendo CAI del tenant:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
