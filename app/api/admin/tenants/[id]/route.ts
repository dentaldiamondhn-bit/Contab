import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { mockTenants } from '../mock-data';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 GET /api/admin/tenants/[id] - Iniciando...');
    
    const { userId, sessionClaims } = await auth();
    const { id } = await params;

    // Get email and role from Clerk user
    let email = '';
    let userRole: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        
        // Check multiple metadata sources for role
        userRole = 
          user.publicMetadata?.role || 
          user.unsafeMetadata?.role ||
          (user.privateMetadata as any)?.role ||
          (sessionClaims?.metadata as any)?.role;
      } catch (error) {
        console.error('Error getting user from Clerk:', error);
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

    // Buscar tenant en Supabase - primero por id, luego por tenant_code
    let { data: tenant, error: tenantError } = await supabaseAdmin
      .from('Tenant')
      .select('*')
      .eq('id', id)
      .single();
    
    // Si no encuentra por id, intentar por tenant_code
    if (tenantError || !tenant) {
      console.log('🔍 No encontrado por id, buscando por tenant_code:', id);
      const { data: tenantByCode, error: codeError } = await supabaseAdmin
        .from('Tenant')
        .select('*')
        .eq('tenant_code', id)
        .single();
      
      if (codeError || !tenantByCode) {
        console.log('❌ Tenant no encontrado en Supabase (ni por id ni por tenant_code):', { tenantError, codeError });
        return NextResponse.json(
          { error: 'Tenant no encontrado' },
          { status: 404 }
        );
      }
      
      tenant = tenantByCode;
      tenantError = null;
    }

    console.log('✅ Tenant encontrado en datos reales:', tenant.businessName);

    // Funciones para limpiar datos
    const cleanEmail = (email: string) => {
      if (!email) return '';
      return email.replace(/\+[A-Za-z0-9]+@/, '@');
    };
    const cleanRTN = (rtn: string) => {
      if (!rtn) return '';
      const match = rtn.match(/^\d{14}/);
      return match ? match[0] : rtn;
    };

    // Enriquecer datos del tenant
    let subscriptionPlans = [];
    try {
      subscriptionPlans = JSON.parse(tenant.subscriptionplans || '["BASICO"]');
    } catch {
      subscriptionPlans = [{ code: tenant.subscriptionplans || 'BASICO', quantity: 1 }];
    }
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
      id: tenant.id,
      businessName: tenant.businessname,
      businessRTN: cleanRTN(tenant.businessrtn),
      businessEmail: cleanEmail(tenant.businessemail),
      businessAddress: tenant.businessaddress,
      tenantCode: tenant.tenant_code,
      phoneNumber: tenant.phonenumber,
      country: tenant.country,
      timezone: tenant.timezone,
      currency: tenant.currency,
      subscriptionPlans: enrichedPlans,
      subscriptionPlan: tenant.subscriptionplans,
      maxUsers: tenant.maxusers,
      maxStorage: tenant.maxstorage,
      maxTransactions: tenant.maxtransactions,
      monthlyCost: tenant.monthlycost,
      modules: tenant.modules ? tenant.modules.split(',').filter((m: string) => m.trim()) : [],
      isActive: tenant.isactive,
      createdAt: tenant.createdat,
      updatedAt: tenant.updatedat,
      users: clerkUsers.length > 0 ? clerkUsers : [
        {
          id: tenant.id,
          email: tenant.businessemail,
          firstName: tenant.businessname?.split(' ')[0] || 'Admin',
          lastName: tenant.businessname?.split(' ').slice(1).join(' ') || 'User',
          role: 'ADMIN',
          isActive: true,
          createdAt: tenant.createdat,
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
    const { id } = await params;

    // Get email and role from Clerk user
    let email = '';
    let userRole: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        
        // Check multiple metadata sources for role
        userRole = 
          user.publicMetadata?.role || 
          user.unsafeMetadata?.role ||
          (user.privateMetadata as any)?.role ||
          (sessionClaims?.metadata as any)?.role;
      } catch (error) {
        console.error('Error getting user from Clerk:', error);
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

    // Actualizar tenant en Supabase
    const { data: updatedTenant, error: updateError } = await supabaseAdmin
      .from('Tenant')
      .update({
        ...updateData,
        updatedat: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error actualizando tenant en Supabase:', updateError);
      return NextResponse.json(
        { error: 'Error actualizando tenant', details: updateError },
        { status: 500 }
      );
    }
    
    console.log('✅ Tenant actualizado en Supabase:', updatedTenant.businessname);

    // Enriquecer los planes con precios para la respuesta
    let updatedSubscriptionPlans = [];
    try {
      updatedSubscriptionPlans = JSON.parse(updatedTenant.subscriptionplans || '["BASICO"]');
    } catch {
      updatedSubscriptionPlans = [{ code: updatedTenant.subscriptionplans || 'BASICO', quantity: 1 }];
    }
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
        modules: updatedTenant.modules ? updatedTenant.modules.split(',').filter((m: string) => m.trim()) : [],
      businessName: updatedTenant.businessname,
      businessRTN: updatedTenant.businessrtn,
      businessEmail: updatedTenant.businessemail,
      businessAddress: updatedTenant.businessaddress
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
    const { id } = await params;

    // Get email and role from Clerk user
    let email = '';
    let userRole: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        
        // Check multiple metadata sources for role
        userRole = 
          user.publicMetadata?.role || 
          user.unsafeMetadata?.role ||
          (user.privateMetadata as any)?.role ||
          (sessionClaims?.metadata as any)?.role;
      } catch (error) {
        console.error('Error getting user from Clerk:', error);
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