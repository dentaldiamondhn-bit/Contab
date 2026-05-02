import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase, getAllTenants } from '@/lib/supabase-db';

export async function GET(req: NextRequest) {
  console.log('🚀 API TENANTS GET - Iniciando...');
  
  try {
    console.log('🔄 GET /api/admin/tenants - Cargando tenants temporales...');
    
    // Verificar autenticación
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

    console.log('✅ Auth check:', { userId, userRole, email, isSuperAdminEmail });

    if (!userId || (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail)) {
      console.log('❌ No autorizado');
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

    console.log('🔄 GET /api/admin/tenants - Cargando DATOS REALES de Supabase...');
    
    // Obtener tenants de la base de datos REAL con Supabase
    const tenants = await getAllTenants();
    console.log('📊 TENANTS REALES:', tenants.map((t: any) => ({ id: t.id, name: t.businessname })));
    console.log('📊 Total tenants reales:', tenants.length);
    console.log('🎯 Incluyendo "angel ring":', tenants.some((t: any) => t.businessname === 'angel ring'));

    // Obtener conteo de usuarios por tenant
    const { data: allUsers, error: usersError } = await supabase
      .from('User')
      .select('tenantid, isactive');
    
    if (usersError) {
      console.error('❌ Error fetching users count:', usersError);
    }

    // Calcular conteos por tenant
    const userCounts: Record<string, { total: number; active: number }> = {};
    allUsers?.forEach((user: any) => {
      const tenantId = user.tenantid;
      if (!userCounts[tenantId]) {
        userCounts[tenantId] = { total: 0, active: 0 };
      }
      userCounts[tenantId].total++;
      if (user.isactive) {
        userCounts[tenantId].active++;
      }
    });
    
    // Filtrar tenants
    let filteredTenants = tenants;
    
    if (search) {
      filteredTenants = filteredTenants.filter((tenant: any) =>
        tenant.businessname.toLowerCase().includes(search.toLowerCase()) ||
        tenant.tenant_code.toLowerCase().includes(search.toLowerCase()) ||
        tenant.businessemail.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status !== 'all') {
      const isActive = status === 'active';
      filteredTenants = filteredTenants.filter((tenant: any) => tenant.isactive === isActive);
    }

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTenants = filteredTenants.slice(startIndex, endIndex);

    // Formatear datos para compatibilidad con frontend (mapear snake_case a camelCase)
    const formattedTenants = paginatedTenants.map((tenant: any) => {
      let subscriptionPlans = [];
      try {
        // Intentar parsear como JSON primero
        subscriptionPlans = JSON.parse(tenant.subscriptionplan || '[]');
      } catch {
        // Si falla, intentar como string separado por comas
        if (tenant.subscriptionplan && typeof tenant.subscriptionplan === 'string') {
          subscriptionPlans = tenant.subscriptionplan.split(',').map((code: string) => ({
            code: code.trim(),
            quantity: 1
          }));
        }
      }

      // Asegurar que subscriptionPlans sea un array válido
      if (!Array.isArray(subscriptionPlans)) {
        subscriptionPlans = [];
      }

      let modules: string[] = [];
      if (tenant.modules) {
        modules = tenant.modules.split(',').filter((m: string) => m.trim());
      }

      // Obtener conteos de usuarios para este tenant
      const counts = userCounts[tenant.id] || { total: 0, active: 0 };

      return {
        id: tenant.id,
        businessName: tenant.businessname,
        businessRTN: tenant.businessrtn,
        businessEmail: tenant.businessemail,
        businessAddress: tenant.businessaddress,
        tenantCode: tenant.tenant_code,
        phoneNumber: tenant.phonenumber || tenant.phoneNumber || null,
        country: tenant.country,
        timezone: tenant.timezone,
        currency: tenant.currency,
        subscriptionPlan: tenant.subscriptionplan,
        subscriptionPlans,
        maxUsers: tenant.maxusers,
        maxStorage: tenant.maxstorage,
        maxTransactions: tenant.maxtransactions,
        monthlyCost: tenant.monthlycost,
        modules,
        isActive: tenant.isactive,
        createdAt: tenant.createdat,
        updatedAt: tenant.updatedat,
        userCounts: {},
        totalUsers: counts.total,
        activeUsers: counts.active
      };
    });

    return NextResponse.json({
      success: true,
      tenants: formattedTenants,
      pagination: {
        page,
        limit,
        total: filteredTenants.length,
        pages: Math.ceil(filteredTenants.length / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/admin/tenants:', error);
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

    // Temporal: No soportamos actualización por ahora
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

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 POST /api/admin/tenants - Creando nuevo tenant...');
    
    // Verificar autenticación
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

    const newTenant = await req.json();
    
    console.log('🔄 Creando tenant en base de datos REAL con Supabase');
    
    // Crear tenant en la base de datos REAL con Supabase
    const { data: createdTenant, error: createError } = await supabase
      .from('Tenant')
      .insert([{
        businessname: newTenant.businessName,
        businessrtn: newTenant.businessRTN,
        businessemail: newTenant.businessEmail,
        businessaddress: newTenant.businessAddress,
        tenant_code: newTenant.tenantCode,
        phonenumber: newTenant.phoneNumber,
        subscriptionplan: JSON.stringify(newTenant.subscriptionPlans || []),
        maxusers: newTenant.maxUsers || 5,
        monthlycost: newTenant.monthlyCost || 0,
        modules: newTenant.modules || null,
        isactive: true,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating tenant:', createError);
      return NextResponse.json(
        { error: 'Error creating tenant' },
        { status: 500 }
      );
    }
    
    console.log('✅ Tenant REAL creado:', createdTenant);

    return NextResponse.json({
      success: true,
      message: 'Tenant creado exitosamente',
      tenant: createdTenant
    });

  } catch (error: any) {
    console.error('❌ Error en POST /api/admin/tenants:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
