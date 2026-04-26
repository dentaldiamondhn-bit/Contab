import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { RealDB } from '@/lib/real-db';

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

    console.log('🔄 GET /api/admin/tenants - Cargando DATOS REALES...');
    
    // Obtener tenants de la base de datos REAL
    const tenants = await RealDB.getRealTenants();
    console.log('📊 TENANTS REALES:', tenants.map(t => ({ id: t.id, name: t.businessName })));
    console.log('📊 Total tenants reales:', tenants.length);
    console.log('🎯 Incluyendo "angel ring":', tenants.some(t => t.businessName === 'angel ring'));
    
    // Filtrar tenants
    let filteredTenants = tenants;
    
    if (search) {
      filteredTenants = filteredTenants.filter(tenant =>
        tenant.businessName.toLowerCase().includes(search.toLowerCase()) ||
        tenant.tenantCode.toLowerCase().includes(search.toLowerCase()) ||
        tenant.businessEmail.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status !== 'all') {
      const isActive = status === 'active';
      filteredTenants = filteredTenants.filter(tenant => tenant.isActive === isActive);
    }

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTenants = filteredTenants.slice(startIndex, endIndex);

    // Formatear datos para compatibilidad con frontend
    const formattedTenants = paginatedTenants.map(tenant => {
      let subscriptionPlans = [];
      try {
        subscriptionPlans = JSON.parse(tenant.subscriptionPlan || '[]');
      } catch {
        subscriptionPlans = [];
      }

      let modules = [];
      if (tenant.modules) {
        modules = tenant.modules.split(',').filter(m => m.trim());
      }

      return {
        ...tenant,
        subscriptionPlans,
        modules,
        userCounts: {},
        totalUsers: 0,
        activeUsers: 0
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
    
    console.log('🔄 Creando tenant en base de datos REAL');
    
    // Crear tenant en la base de datos REAL
    const createdTenant = await RealDB.createRealTenant(newTenant);
    
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
