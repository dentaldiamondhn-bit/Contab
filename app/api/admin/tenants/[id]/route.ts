import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { RealDB } from '@/lib/real-db';
import { mockTenants } from '../mock-data';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 GET /api/admin/tenants/[id] - Iniciando...');
    
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

    console.log('✅ Auth check:', { userId, userRole, email, isSuperAdminEmail, tenantId: id });

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail)) {
      console.log('❌ No autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Buscar tenant en datos reales
    const realTenants = await RealDB.getRealTenants();
    const tenant = realTenants.find(t => t.id === id);
    
    if (!tenant) {
      console.log('❌ Tenant no encontrado en datos reales');
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Tenant encontrado en datos reales:', tenant.businessName);

    // Enriquecer datos del tenant
    const subscriptionPlans = JSON.parse(tenant.subscriptionPlans || '["BASICO"]');
    const planPrices: Record<string, number> = {
      'BASICO': 500,
      'PREMIUM': 1000,
      'ENTERPRISE': 2000,
      'STARTER': 200,
      'GROWTH': 750
    };

    const enrichedPlans = subscriptionPlans.map((plan: any) => {
      const planCode = typeof plan === 'string' ? plan : plan.code;
      const quantity = typeof plan === 'string' ? 1 : (plan.quantity || 1);
      
      return {
        code: planCode,
        quantity: quantity,
        price: planPrices[planCode] || 500,
        name: `Plan ${planCode}`,
        description: `Suscripción al plan ${planCode}`,
        taxRate: 15,
        discount: 0
      };
    });

    // Obtener usuarios de Clerk para este tenant
    let clerkUsers: any[] = [];
    try {
      const client = await clerkClient();
      const allUsersResponse = await client.users.getUserList();
      const allUsers = allUsersResponse.data;
      console.log('🔍 Original API - Todos los usuarios en Clerk:', allUsers.length);
      console.log('🔍 Original API - Buscando usuarios para tenantId:', id);
      
      allUsers.forEach((user: any, index: number) => {
        const metadata = user.publicMetadata as any;
        console.log(`👤 Original API - Usuario ${index}:`, {
          email: user.emailAddresses[0]?.emailAddress,
          tenantId: metadata.tenantId,
          role: metadata.role
        });
      });
      
      clerkUsers = allUsers.filter((user: any) => {
        const metadata = user.publicMetadata as any;
        return metadata.tenantId === id;
      }).map((user: any) => ({
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: (user.publicMetadata as any)?.role || 'USER',
        tenantId: (user.publicMetadata as any)?.tenantId || '',
        tenantCode: (user.publicMetadata as any)?.tenantCode || '',
        isActive: true,
        createdAt: user.createdAt,
        lastLoginAt: new Date().toISOString()
      }));
      
      console.log('📊 Original API - Usuarios de Clerk encontrados:', clerkUsers.length);
    } catch (error) {
      console.error('Error obteniendo usuarios de Clerk:', error);
    }

    const enrichedTenant = {
      ...tenant,
      subscriptionPlans: enrichedPlans,
      modules: tenant.modules ? tenant.modules.split(',').filter(m => m.trim()) : [],
      users: clerkUsers.length > 0 ? clerkUsers : [
        {
          id: tenant.id,
          email: tenant.businessEmail,
          firstName: tenant.businessName.split(' ')[0] || 'Admin',
          lastName: tenant.businessName.split(' ').slice(1).join(' ') || 'User',
          role: 'ADMIN',
          isActive: true,
          createdAt: tenant.createdAt,
          lastLoginAt: new Date().toISOString()
        }
      ], 
      userCounts: clerkUsers.length > 0 ? 
        clerkUsers.reduce((acc: any, user: any) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {}) : 
        { ADMIN: 1 }, 
      totalUsers: clerkUsers.length > 0 ? clerkUsers.length : 1, 
      activeUsers: clerkUsers.length > 0 ? clerkUsers.filter((u: any) => u.isActive).length : 1
    };

    console.log('✅ Tenant enriquecido devuelto');

    return NextResponse.json(enrichedTenant);

  } catch (error: any) {
    console.error('❌ Error en GET /api/admin/tenants/[id]:', error);
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
    console.log('🔄 PATCH /api/admin/tenants/[id] - Actualizando tenant...');
    
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

    console.log('✅ Auth check:', { userId, userRole, email, isSuperAdminEmail, tenantId: id });

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail)) {
      console.log('❌ No autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Parse request body
    const updateData = await req.json();
    console.log('📦 Datos a actualizar:', updateData);

    // Buscar tenant en datos reales
    const realTenants = await RealDB.getRealTenants();
    const tenantIndex = realTenants.findIndex(t => t.id === id);
    
    if (tenantIndex === -1) {
      console.log('❌ Tenant no encontrado en datos reales');
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar tenant en base de datos persistente
    const updatedTenant = await RealDB.updateTenant(id, updateData);
    console.log('✅ Tenant actualizado en datos reales:', updatedTenant.businessName);

    // Enriquecer los planes con precios para la respuesta
    const updatedSubscriptionPlans = JSON.parse(updatedTenant.subscriptionPlans || '["BASICO"]');
    const planPrices: Record<string, number> = {
      'BASICO': 500,
      'PREMIUM': 1000,
      'ENTERPRISE': 2000,
      'STARTER': 200,
      'GROWTH': 750
    };

    const enrichedUpdatedPlans = updatedSubscriptionPlans.map((plan: any) => {
      const planCode = typeof plan === 'string' ? plan : plan.code;
      const quantity = typeof plan === 'string' ? 1 : (plan.quantity || 1);
      
      return {
        code: planCode,
        quantity: quantity,
        price: planPrices[planCode] || 500,
        name: `Plan ${planCode}`,
        description: `Suscripción al plan ${planCode}`,
        taxRate: 15,
        discount: 0
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Tenant actualizado exitosamente',
      tenant: {
        ...updatedTenant,
        subscriptionPlans: enrichedUpdatedPlans,
        modules: updatedTenant.modules ? updatedTenant.modules.split(',').filter((m: string) => m.trim()) : []
      }
    });

  } catch (error: any) {
    console.error('❌ Error en PATCH /api/admin/tenants/[id]:', error);
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
    console.log('🔄 DELETE /api/admin/tenants/[id] - Eliminando tenant...');
    
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

    console.log('✅ Auth check:', { userId, userRole, email, isSuperAdminEmail, tenantId: id });

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail)) {
      console.log('❌ No autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Buscar tenant en datos mock
    const tenantIndex = mockTenants.findIndex(t => t.id === id);
    
    if (tenantIndex === -1) {
      console.log('❌ Tenant no encontrado en datos mock');
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    const deletedTenant = mockTenants[tenantIndex];
    
    // Eliminar tenant de datos mock
    mockTenants.splice(tenantIndex, 1);

    console.log('✅ Tenant eliminado exitosamente de datos mock:', deletedTenant.businessName);
    console.log('📊 Tenants restantes en mock:', mockTenants.map(t => ({ id: t.id, name: t.businessName })));

    return NextResponse.json({
      success: true,
      message: 'Tenant eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error en DELETE /api/admin/tenants/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}