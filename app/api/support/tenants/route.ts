import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    // Solo SUPER_ADMIN y SUPPORT pueden acceder
    if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Para SUPPORT, devolver información limitada de tenants
    const tenants = await db.tenant.findMany({
      select: {
        id: true,
        businessName: true,
        tenantCode: true,
        subscriptionPlan: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { 
            users: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: {
        businessName: 'asc'
      }
    });

    // Formatear la respuesta
    const formattedTenants = tenants.map(tenant => ({
      id: tenant.id,
      businessName: tenant.businessName,
      tenantCode: tenant.tenantCode,
      subscriptionPlan: tenant.subscriptionPlan,
      isActive: tenant.isActive,
      userCount: tenant._count.users,
      createdAt: tenant.createdAt
    }));

    return NextResponse.json({ 
      success: true,
      tenants: formattedTenants 
    });

  } catch (error: any) {
    console.error('Error en API de support/tenants:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    // Solo SUPER_ADMIN puede crear tenants
    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { businessName, businessRTN, businessEmail, businessAddress } = body;

    // Validaciones básicas
    if (!businessName || !businessRTN || !businessEmail || !businessAddress) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Generar código único
    const prefix = businessName
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 3)
      .toUpperCase();
    
    let counter = 1;
    let tenantCode = `${prefix}${counter.toString().padStart(3, '0')}`;

    // Verificar si el código ya existe
    while (await db.tenant.findUnique({ where: { tenantCode } })) {
      counter++;
      tenantCode = `${prefix}${counter.toString().padStart(3, '0')}`;
    }

    // Crear tenant
    const tenant = await db.tenant.create({
      data: {
        businessName,
        businessRTN,
        businessEmail,
        businessAddress,
        tenantCode,
        country: 'HN',
        subscriptionPlan: 'BASIC',
        maxUsers: 5,
        maxStorage: 100,
        maxTransactions: 10000,
        monthlyCost: 1000,
        isActive: true
      },
      select: {
        id: true,
        businessName: true,
        tenantCode: true,
        subscriptionPlan: true,
        isActive: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      tenant
    });

  } catch (error: any) {
    console.error('Error creando tenant:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'El RTN o email ya existe' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
