import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { db } from '@/lib/db';

// Inicializar Clerk con la secret key del servidor
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export async function GET(req: NextRequest) {
  try {
    // Verificar que el usuario autenticado sea SUPER_ADMIN o SUPPORT
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    // Get email from Clerk user
    let email = '';
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
      } catch (error) {
        console.error('Error getting user email from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail)) {
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
          subscriptionPlans: true,
          maxUsers: true,
          monthlyCost: true,
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
  console.log('POST /api/admin/tenants - Endpoint called');
  try {
    // Solo SUPER_ADMIN puede crear tenants
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    // Get email from Clerk user
    let email = '';
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
      } catch (error) {
        console.error('Error getting user email from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    console.log('Create tenant - User check:', { userId, userRole, email, isSuperAdminEmail });

    if (!userId || (userRole !== 'SUPER_ADMIN' && !isSuperAdminEmail)) {
      console.log('Create tenant - BLOCKING ACCESS: Not SUPER_ADMIN');
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
      modules,
      adminUser
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

    // Crear usuario admin si se proporcionaron datos
    if (adminUser && adminUser.email && adminUser.firstName && adminUser.lastName && adminUser.password) {
      try {
        // Verificar que el email no exista ya en Clerk
        const existingUsers = await clerk.users.getUserList({
          emailAddress: [adminUser.email],
          limit: 1
        });

        if (existingUsers.length > 0) {
          console.log('El email ya existe en Clerk, omitiendo creación de usuario admin');
        } else {
          // Crear usuario en Clerk
          const clerkUser = await clerk.users.createUser({
            emailAddress: [adminUser.email],
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            password: adminUser.password,
            username: `${adminUser.firstName.toLowerCase()}_${adminUser.lastName.toLowerCase()}`,
            publicMetadata: {
              role: 'ADMIN',
              tenantId: tenant.id,
              tenantCode: tenant.tenantCode,
              permissions: [
                'tenant:admin',
                'users:tenant_manage',
                'inventory:manage',
                'accounting:manage',
                'reports:tenant'
              ],
              isolation: {
                tenantScope: true,
                crossTenantAccess: false,
                dataVisibility: 'tenant_only'
              }
            }
          });

          // Crear usuario en base de datos local
          await db.user.create({
            data: {
              authId: clerkUser.id,
              email: adminUser.email,
              firstName: adminUser.firstName,
              lastName: adminUser.lastName,
              role: 'ADMIN',
              tenantId: tenant.id,
              isActive: true
            }
          });

          console.log('Usuario admin creado exitosamente:', adminUser.email);
        }
      } catch (error) {
        console.error('Error creando usuario admin:', error);
        // No fallar la creación del tenant si falla el usuario admin
      }
    }

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
