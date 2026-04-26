import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// Datos temporales de tenants (simulación)
let mockTenants: any[] = [
  {
    id: 'cmoegv9te0009z0pax786qqqn',
    businessName: 'Dental Diamond',
    tenantCode: 'DD001',
    businessEmail: 'dental@contab.com',
    businessRTN: '05011991078006',
    phoneNumber: '+504 2234-5678',
    businessAddress: 'Barrio Guamilito 6calle, entre 9y10 ave',
    subscriptionPlans: '["BASICO"]',
    maxUsers: 5,
    monthlyCost: 500,
    isActive: true,
    modules: '["accounting", "billing", "reports"]',
    createdAt: '2024-01-15T10:30:00.000Z',
    users: [],
    userCounts: {},
    totalUsers: 0,
    activeUsers: 0
  },
  {
    id: 'cmoegv9te0009z0pax786qqqr',
    businessName: 'Medical Center',
    tenantCode: 'MC002',
    businessEmail: 'medical@contab.com',
    businessRTN: '05011991078007',
    phoneNumber: '+504 2234-5679',
    businessAddress: 'Tegucigalpa, Honduras',
    subscriptionPlans: '["PREMIUM"]',
    maxUsers: 20,
    monthlyCost: 1000,
    isActive: true,
    modules: '["accounting", "billing", "reports", "inventory"]',
    createdAt: '2024-02-20T15:45:00.000Z',
    users: [],
    userCounts: {},
    totalUsers: 0,
    activeUsers: 0
  },
  {
    id: 'cmoegv9te0009z0pax786qqqs',
    businessName: 'Legal Services',
    tenantCode: 'LS003',
    businessEmail: 'legal@contab.com',
    businessRTN: '05011991078008',
    phoneNumber: '+504 2234-5680',
    businessAddress: 'San Pedro Sula, Honduras',
    subscriptionPlans: '["ENTERPRISE"]',
    maxUsers: 50,
    monthlyCost: 2000,
    isActive: false,
    modules: '["accounting", "billing", "reports", "inventory", "payroll"]',
    createdAt: '2024-03-10T09:20:00.000Z',
    users: [],
    userCounts: {},
    totalUsers: 0,
    activeUsers: 0
  }
];

export async function GET(req: NextRequest) {
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

    // Filtrar tenants
    let filteredTenants = mockTenants;
    
    if (search) {
      filteredTenants = filteredTenants.filter(tenant =>
        tenant.businessName.toLowerCase().includes(search.toLowerCase()) ||
        tenant.tenantCode.toLowerCase().includes(search.toLowerCase()) ||
        tenant.businessEmail.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status !== 'all') {
      filteredTenants = filteredTenants.filter(tenant => 
        tenant.isActive === (status === 'active')
      );
    }

    // Paginación
    const total = filteredTenants.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const paginatedTenants = filteredTenants.slice(skip, skip + limit);

    console.log('✅ Tenants cargados:', paginatedTenants.length, 'de', total);

    return NextResponse.json({
      success: true,
      tenants: paginatedTenants,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
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
    
    // Agregar a la lista temporal
    const createdTenant = {
      ...newTenant,
      id: `tenant-${Date.now()}`,
      tenantCode: newTenant.tenantCode || `TC${mockTenants.length + 1}`,
      createdAt: new Date().toISOString(),
      isActive: true,
      users: [],
      userCounts: {},
      totalUsers: 0,
      activeUsers: 0
    };
    
    mockTenants.push(createdTenant);
    
    console.log('✅ Tenant creado:', createdTenant);

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
