import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET() {
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

    // Obtener información fiscal del tenant
    const tenant = await (db as any).tenant.findUnique({
      where: { id: user.tenantid },
      select: {
        businessRTN: true,
        businessName: true,
        businessAddress: true,
        businessEmail: true,
        phoneNumber: true,
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const fiscalInfo = {
      rtn: tenant.businessRTN,
      businessName: tenant.businessName,
      businessAddress: tenant.businessAddress,
      email: tenant.businessEmail,
      phone: tenant.phoneNumber,
    };

    return NextResponse.json({
      success: true,
      data: fiscalInfo
    });

  } catch (error) {
    console.error('Error obteniendo información fiscal:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { rtn, businessName, businessAddress, email, phone } = body;

    // Validación básica
    if (!rtn || !businessName || !businessAddress) {
      return NextResponse.json({ 
        error: 'RTN, nombre y dirección son obligatorios' 
      }, { status: 400 });
    }

    // Actualizar información fiscal del tenant
    const updatedTenant = await (db as any).tenant.update({
      where: { id: user.tenantid },
      data: {
        businessRTN: rtn,
        businessName: businessName,
        businessAddress: businessAddress,
        businessEmail: email,
        phoneNumber: phone,
        updatedAt: new Date()
      }
    });

    const fiscalInfo = {
      rtn: updatedTenant.businessRTN,
      businessName: updatedTenant.businessName,
      businessAddress: updatedTenant.businessAddress,
      email: updatedTenant.businessEmail,
      phone: updatedTenant.phoneNumber,
    };

    return NextResponse.json({
      success: true,
      data: fiscalInfo,
      message: 'Información fiscal actualizada correctamente'
    });

  } catch (error) {
    console.error('Error actualizando información fiscal:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
