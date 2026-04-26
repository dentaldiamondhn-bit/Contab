import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { RealDB } from '@/lib/real-db';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

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

    // Buscar tenant en RealDB
    const tenants = await RealDB.getRealTenants();
    const tenant = tenants.find(t => t.id === id);

    if (!tenant) {
      console.log('❌ Tenant no encontrado en base de datos');
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Tenant encontrado:', tenant.businessName, 'Email:', tenant.businessEmail);

    // Validar que el usuario autenticado sea SUPER_ADMIN o tenga el mismo email del tenant
    const isTenantOwner = email === tenant.businessEmail;
    
    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail && !isTenantOwner)) {
      console.log('❌ No autorizado - Email no coincide con tenant');
      console.log('  Email usuario:', email);
      console.log('  Email tenant:', tenant.businessEmail);
      return NextResponse.json(
        { error: 'No autorizado - Solo el propietario del tenant puede acceder' },
        { status: 403 }
      );
    }

    console.log('✅ Autorización concedida - Usuario es propietario del tenant o admin');

    // Obtener usuarios de Clerk para este tenant
    let users: any[] = [];
    try {
      const allUsers = await clerk.users.getUserList();
      console.log('🔍 Todos los usuarios en Clerk:', allUsers.length);
      console.log('🔍 Buscando usuarios para tenantId:', id);
      console.log('🔍 Usuario es Super Admin:', isSuperAdminEmail);
      
      allUsers.forEach((user: any, index: number) => {
        const metadata = user.publicMetadata as any;
        console.log(`👤 Usuario ${index}:`, {
          email: user.emailAddresses[0]?.emailAddress,
          tenantId: metadata.tenantId,
          role: metadata.role
        });
      });
      
      // Si es super admin, mostrar todos los usuarios
      if (isSuperAdminEmail) {
        console.log('👑 Super Admin: Mostrando todos los usuarios');
        users = allUsers.map((user: any) => ({
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: (user.publicMetadata as any)?.role || 'USER',
          tenantId: (user.publicMetadata as any)?.tenantId || '',
          tenantCode: (user.publicMetadata as any)?.tenantCode || '',
          isActive: true
        }));
      } else {
        // Si no es super admin, mostrar solo usuarios del tenant
        console.log('🏢 Usuario normal: Mostrando solo usuarios del tenant');
        users = allUsers.filter((user: any) => {
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
          isActive: true
        }));
      }
      
      console.log('📊 Usuarios encontrados en Clerk:', users.length);
    } catch (error) {
      console.error('Error obteniendo usuarios de Clerk:', error);
    }

    // Enriquecer datos del tenant
    const enrichedTenant = {
      ...tenant,
      subscriptionPlans: JSON.parse(tenant.subscriptionPlans || '["BASICO"]'),
      modules: tenant.modules ? tenant.modules.split(',') : [],
      users,
      userCounts: {
        total: users.length,
        active: users.filter(u => u.isActive).length
      },
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length, 
      // Agregar planes como items de factura basados en subscriptionPlans
      tenantPlans: JSON.parse(tenant.subscriptionPlans || '["BASICO"]').map((planCode: string, index: number) => {
        // Definir precios y detalles para cada plan
        const planDetails: Record<string, any> = {
          'BASICO': {
            id: 'plan-basic',
            code: 'BASICO',
            name: 'Plan Básico',
            description: 'Plan básico de contabilidad con facturación electrónica y reportes básicos',
            quantity: 1,
            unitPrice: 500,
            subtotal: 500,
            taxRate: 15,
            taxAmount: 75,
            total: 575
          },
          'PREMIUM': {
            id: 'plan-premium',
            code: 'PREMIUM',
            name: 'Plan Premium',
            description: 'Plan premium con contabilidad completa, nómina, inventario y reportes avanzados',
            quantity: 1,
            unitPrice: 1000,
            subtotal: 1000,
            taxRate: 15,
            taxAmount: 150,
            total: 1150
          },
          'ENTERPRISE': {
            id: 'plan-enterprise',
            code: 'ENTERPRISE',
            name: 'Plan Enterprise',
            description: 'Plan enterprise con todos los módulos, soporte prioritario y personalización',
            quantity: 1,
            unitPrice: 2000,
            subtotal: 2000,
            taxRate: 15,
            taxAmount: 300,
            total: 2300
          }
        };

        return planDetails[planCode] || {
          id: `plan-${index}`,
          code: planCode,
          name: `Plan ${planCode}`,
          description: `Servicios incluidos en el plan ${planCode}`,
          quantity: 1,
          unitPrice: 500,
          subtotal: 500,
          taxRate: 15,
          taxAmount: 75,
          total: 575
        };
      })
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

    // Buscar tenant en RealDB
    const tenants = await RealDB.getRealTenants();
    const tenant = tenants.find(t => t.id === id);

    if (!tenant) {
      console.log('❌ Tenant no encontrado en base de datos');
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    // Validar que el usuario autenticado sea SUPER_ADMIN o tenga el mismo email del tenant
    const isTenantOwner = email === tenant.businessEmail;
    
    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail && !isTenantOwner)) {
      console.log('❌ No autorizado - Email no coincide con tenant');
      console.log('  Email usuario:', email);
      console.log('  Email tenant:', tenant.businessEmail);
      return NextResponse.json(
        { error: 'No autorizado - Solo el propietario del tenant puede acceder' },
        { status: 403 }
      );
    }

    // Parse request body
    const updateData = await req.json();
    console.log('📦 Datos a actualizar:', updateData);

    // TODO: Implementar actualización en RealDB cuando esté disponible
    console.log('⚠️ Actualización de tenant no soportada temporalmente');

    return NextResponse.json({
      success: false,
      message: 'Actualización de tenant no soportada temporalmente'
    });

  } catch (error: any) {
    console.error('❌ Error en PATCH /api/admin/tenants/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
