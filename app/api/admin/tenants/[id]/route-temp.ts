import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// Datos temporales de tenants (simulación)
const mockTenants: any[] = [
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
  }
];

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

    console.log('🔍 Buscando tenant:', id);

    // Buscar tenant en datos mock
    const tenant = mockTenants.find(t => t.id === id);
    
    if (!tenant) {
      console.log('❌ Tenant no encontrado');
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Tenant encontrado:', tenant.businessName);

    // Enriquecer datos del tenant
    const enrichedTenant = {
      ...tenant,
      subscriptionPlans: JSON.parse(tenant.subscriptionPlans || '["BASICO"]'),
      modules: JSON.parse(tenant.modules || '[]'),
      // Agregar planes como items de factura
      tenantPlans: [
        {
          id: 'plan-basic',
          code: 'BASICO',
          name: 'Plan Básico',
          description: 'Plan básico de contabilidad',
          quantity: 1,
          unitPrice: 500,
          subtotal: 500,
          taxRate: 15,
          taxAmount: 75,
          total: 575
        }
      ]
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
