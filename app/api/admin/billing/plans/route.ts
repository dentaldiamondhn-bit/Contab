import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest
) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    const userEmail = sessionClaims?.email;

    // Verificar autorización
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener email del usuario para verificación
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
    const isAuthorized = userRole === 'SUPER_ADMIN' || isSuperAdminEmail;

    console.log('Plans API - Auth check:', { userId, userRole, email, isAuthorized });

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Se requiere tenantId' }, { status: 400 });
    }

    // Obtener información del tenant con sus planes
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    console.log('Tenant data:', tenant);
    console.log('SubscriptionPlans field:', (tenant as any).subscriptionPlans);
    console.log('SubscriptionPlan field:', (tenant as any).subscriptionPlan);

    // Procesar los planes
    let plans = [];
    try {
      // Intentar con diferentes nombres de campo que podrían existir
      const plansData = (tenant as any).subscriptionPlans || (tenant as any).subscriptionPlan || 'BASIC';
      plans = typeof plansData === 'string' 
        ? JSON.parse(plansData) 
        : plansData || [];
      
      // Si es un string simple como "BASIC", convertirlo a un formato de plan
      if (typeof plans === 'string' && plans === 'BASIC') {
        plans = [{
          code: 'BASIC',
          name: 'Plan Básico',
          description: 'Plan básico de suscripción',
          price: 500.00,
          quantity: 1,
          taxRate: 15,
          discount: 0
        }];
      }
    } catch (e) {
      console.error('Error procesando planes:', e);
      // Plan básico por defecto
      plans = [{
        code: 'BASIC',
        name: 'Plan Básico',
        description: 'Plan básico de suscripción',
        price: 500.00,
        quantity: 1,
        taxRate: 15,
        discount: 0
      }];
    }

    // Formatear los planes para la factura
    const invoiceItems = plans.map((plan: any, index: number) => {
      // Calcular valores
      const unitPrice = plan.price || 0;
      const quantity = plan.quantity || 1;
      const discount = plan.discount || 0;
      const taxRate = plan.taxRate || 15;
      
      const subtotal = (unitPrice * quantity) - discount;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      
      return {
        id: `plan-${index}`,
        code: plan.code || `PLAN-${index + 1}`,
        name: plan.name || `Plan ${plan.code || 'BASIC'}`,
        description: plan.description || '',
        quantity,
        unitPrice,
        taxRate,
        discount,
        subtotal,
        taxAmount,
        total
      };
    });

    return NextResponse.json({
      success: true,
      plans: invoiceItems,
      tenant: {
        id: tenant.id,
        businessName: tenant.businessName
      }
    });

  } catch (error: any) {
    console.error('Error obteniendo planes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
