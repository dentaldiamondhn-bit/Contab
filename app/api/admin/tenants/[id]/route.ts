import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    const { id } = await params;

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

    console.log('GET /api/admin/tenants/[id] - Auth check:', { userId, userRole, email, isSuperAdminEmail });

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail)) {
      console.log('GET /api/admin/tenants/[id] - BLOCKING ACCESS');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });

    console.log('GET /api/admin/tenants/[id] - Tenant found:', !!tenant);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    // Enriquecer datos del tenant
    let subscriptionPlans = [];
    try {
      subscriptionPlans = typeof (tenant as any).subscriptionPlans === 'string' 
        ? JSON.parse((tenant as any).subscriptionPlans) 
        : (tenant as any).subscriptionPlans || [];
    } catch (e) {
      subscriptionPlans = [];
    }

    let modules: string[] = [];
    try {
      modules = tenant.modules ? tenant.modules.split(',').filter((m: string) => m.trim()) : [];
    } catch (e) {
      modules = [];
    }

    // Contar usuarios por tipo
    const userCounts = (tenant as any).users?.reduce((acc: Record<string, number>, user: any) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      acc.total = (acc.total || 0) + 1;
      acc.active = user.isActive ? (acc.active || 0) + 1 : (acc.active || 0);
      return acc;
    }, {} as Record<string, number>) || {};

    const enrichedTenant = {
      ...tenant,
      subscriptionPlans,
      modules,
      userCounts,
      totalUsers: userCounts.total || 0,
      activeUsers: userCounts.active || 0
    };

    return NextResponse.json(enrichedTenant);
  } catch (error: any) {
    console.error('Error obteniendo tenant:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    const { id } = await params;

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

    const body = await req.json();
    console.log('PATCH /api/admin/tenants/[id] - Request body:', body);
    const { businessName, businessEmail, businessRTN, phoneNumber, businessAddress, subscriptionPlan, maxUsers, monthlyCost, modules, isActive } = body;

    console.log('PATCH /api/admin/tenants/[id] - Updating tenant with data:', {
        subscriptionPlan,
        maxUsers,
        monthlyCost,
        modules
      });

    const tenant = await db.tenant.update({
      where: { id },
      data: {
        ...(businessName && { businessName }),
        ...(businessEmail && { businessEmail }),
        ...(businessRTN && { businessRTN }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(businessAddress && { businessAddress }),
        ...(subscriptionPlan && { subscriptionPlans: subscriptionPlan }),
        ...(maxUsers !== undefined && { maxUsers }),
        ...(monthlyCost !== undefined && { monthlyCost }),
        ...(modules && { modules }),
        ...(isActive !== undefined && { isActive })
      }
    });

    return NextResponse.json(tenant);
  } catch (error: any) {
    console.error('Error actualizando tenant:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    const { id } = await params;

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

    await db.tenant.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error eliminando tenant:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
