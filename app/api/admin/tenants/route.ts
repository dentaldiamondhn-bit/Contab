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

    // Obtener tenants con información detallada
    const [tenants, totalCount] = await Promise.all([
      db.tenant.findMany({
        where,
        skip,
        take: limit,
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true
            }
          }
        },
        orderBy: {
          businessName: 'asc'
        }
      }),
      db.tenant.count({ where })
    ]);

    // Enriquecer datos de tenants
    const enrichedTenants = tenants.map(tenant => {
      // Parsear planes de suscripción
      let subscriptionPlans = [];
      try {
        subscriptionPlans = typeof (tenant as any).subscriptionPlans === 'string' 
          ? JSON.parse((tenant as any).subscriptionPlans) 
          : (tenant as any).subscriptionPlans || [];
      } catch (e) {
        subscriptionPlans = [];
      }

      // Parsear módulos
      let modules: string[] = [];
      try {
        modules = tenant.modules ? tenant.modules.split(',').filter((m: string) => m.trim()) : [];
      } catch (e) {
        modules = [];
      }

      // Contar usuarios por tipo
      const userCounts = tenant.users.reduce((acc: Record<string, number>, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        acc.total = (acc.total || 0) + 1;
        acc.active = user.isActive ? (acc.active || 0) + 1 : (acc.active || 0);
        return acc;
      }, {} as Record<string, number>);

      return {
        ...tenant,
        subscriptionPlans,
        modules,
        userCounts,
        totalUsers: userCounts.total || 0,
        activeUsers: userCounts.active || 0
      };
    });

    return NextResponse.json({
      success: true,
      tenants: enrichedTenants,
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
      subscriptionPlans = 'BASIC',
      maxUsers = 5,
      monthlyCost = 1000,
      modules = '',
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
    const tenant = await (db as any).tenant.create({
      data: {
        businessName,
        businessEmail,
        businessRTN,
        phoneNumber,
        businessAddress,
        tenantCode,
        subscriptionPlans: JSON.stringify(subscriptionPlans),
        maxUsers,
        monthlyCost,
        modules: Array.isArray(modules) ? modules.join(',') : modules,
        isActive: true
      }
    });

    // Si se proporcionó usuario admin, crearlo
    if (adminUser) {
      const clerkUser = await clerk.users.createUser({
        emailAddress: [adminUser.email],
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        username: adminUser.username,
        password: adminUser.password,
      });

      // Asignar rol de admin al usuario
      await clerk.users.updateUser(clerkUser.id, {
        publicMetadata: {
          role: 'ADMIN',
          tenantId: tenant.id
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
    }

    return NextResponse.json({
      success: true,
      tenant,
      message: 'Tenant creado exitosamente'
    });
  } catch (error: any) {
    console.error('Error creando tenant:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
