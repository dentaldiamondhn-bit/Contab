import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Verificar que el usuario autenticado sea SUPER_ADMIN o SUPPORT
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    if (!userId || !['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const skip = (page - 1) * limit;

    // Construir where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { tenantCode: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status !== 'all') {
      where.isActive = status === 'active';
    }

    // Obtener tenants con conteo de usuarios
    const [tenants, totalCount] = await Promise.all([
      db.tenant.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          businessName: true,
          tenantCode: true,
          businessEmail: true,
          subscriptionPlan: true,
          maxUsers: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { users: true }
          }
        },
        orderBy: {
          businessName: 'asc'
        }
      }),
      db.tenant.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      tenants,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error: any) {
    console.error('Error obteniendo tenants:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Solo SUPER_ADMIN puede crear tenants
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    if (!userId || userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Solo SUPER_ADMIN puede crear tenants.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      businessName,
      businessEmail,
      businessRTN,
      phoneNumber,
      businessAddress,
      subscriptionPlan = 'BASIC',
      maxUsers = 5,
      modules
    } = body;

    // Validar datos requeridos
    if (!businessName || !businessEmail || !businessRTN) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Generar tenant code único
    const baseCode = businessName.toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    
    let tenantCode = baseCode;
    let counter = 1;
    
    while (await db.tenant.findUnique({ where: { tenantCode } })) {
      tenantCode = `${baseCode}${counter}`;
      counter++;
    }

    // Crear tenant
    const tenant = await db.tenant.create({
      data: {
        businessName,
        businessEmail,
        businessRTN,
        phoneNumber: phoneNumber || null,
        businessAddress: businessAddress || null,
        tenantCode,
        subscriptionPlan,
        maxUsers,
        modules: modules || null,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      tenant,
      message: 'Tenant creado exitosamente'
    });

  } catch (error: any) {
    console.error('Error creando tenant:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'El email o código de tenant ya existe' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
