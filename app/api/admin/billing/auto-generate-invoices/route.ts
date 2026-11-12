import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

// Obtener el CAI del sistema configurado
function getSystemCAI() {
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  
  return {
    cai: 'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A',
    rangeStart: 1,
    rangeEnd: 1000,
    currentNumber: 1,
    expiryDate: expiryDate.toISOString(),
    rtn: '05011991078006',
    businessName: 'CONTAB HN',
    businessAddress: 'Tegucigalpa, Honduras',
    establishmentCode: '001',
    pointOfSaleCode: '001',
    economicActivity: '631100',
    taxRate: 15
  };
}

// Función para generar factura automáticamente para un tenant
async function generateInvoiceForTenant(tenant: any, caiInfo: any) {
  try {
    // Obtener planes del tenant
    let subscriptionPlans: any[] = [];
    try {
      subscriptionPlans = JSON.parse(tenant.subscriptionplan || '[]');
    } catch {
      if (tenant.subscriptionplan && typeof tenant.subscriptionplan === 'string') {
        subscriptionPlans = tenant.subscriptionplan.split(',').map((code: string) => ({
          code: code.trim(),
          quantity: 1
        }));
      }
    }

    // Si no tiene planes, no generar factura
    if (!subscriptionPlans || subscriptionPlans.length === 0) {
      console.log(`⚠️ Tenant ${tenant.id} no tiene planes, omitiendo...`);
      return null;
    }

    // Calcular items de factura
    const planPrices: Record<string, number> = {
      'BASICO': 500,
      'PREMIUM': 1000,
      'ENTERPRISE': 2000,
      'STARTER': 200,
      'GROWTH': 750
    };

    const invoiceItems: any[] = [];
    let subtotal = 0;
    
    const now = new Date();
    const monthYear = now.toLocaleString('es-HN', { month: 'long', year: 'numeric' });

    for (const plan of subscriptionPlans) {
      const planCode = typeof plan === 'string' ? plan : plan.code;
      const quantity = typeof plan === 'string' ? 1 : (plan.quantity || 1);
      const unitPrice = planPrices[planCode] || 500;
      const planSubtotal = unitPrice * quantity;
      const taxRate = 0.15;
      const taxAmount = planSubtotal * taxRate;
      const total = planSubtotal + taxAmount;
      
      subtotal += planSubtotal;
      
      invoiceItems.push({
        code: planCode,
        name: `Plan ${planCode}`,
        description: `Servicios de contabilidad - ${monthYear}`,
        quantity: quantity,
        unitPrice: unitPrice,
        taxRate: 15,
        discount: 0,
        subtotal: planSubtotal,
        taxAmount: taxAmount,
        total: total
      });
    }

    const totalTax = subtotal * 0.15;
    let total = subtotal + totalTax;

    // Aplicar créditos no usados del tenant
    let creditApplied = 0;
    let creditCompIds: string[] = [];
    try {
      const { data: credits } = await supabase
        .from('TenantCompensation')
        .select('id, amount')
        .eq('tenantid', tenant.id)
        .eq('type', 'CREDIT')
        .eq('used', false)
        .order('createdat', { ascending: true });

      if (credits && credits.length > 0) {
        let remaining = total;
        for (const credit of credits) {
          if (remaining <= 0) break;
          const available = credit.amount || 0;
          if (available <= 0) continue;
          const toApply = Math.min(available, remaining);
          creditApplied += toApply;
          remaining -= toApply;
          creditCompIds.push(credit.id);
        }
      }
    } catch (e) {
      // Table may not have 'used' column yet - ignore
    }

    // Generar número de factura
    const invoiceNumber = `CONTAB-${tenant.tenant_code}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    const invoiceData = {
      id: `INV-${Date.now()}-${tenant.id}`,
      tenantId: tenant.id,
      invoiceNumber: invoiceNumber,
      invoiceDate: now.toISOString(),
      customerId: tenant.id,
      customerRTN: tenant.businessrtn,
      customerName: tenant.businessname,
      customerAddress: tenant.businessaddress,
      customerEmail: tenant.businessemail,
      issuerRTN: caiInfo.rtn,
      issuerName: caiInfo.businessName,
      issuerAddress: caiInfo.businessAddress,
      cai: caiInfo.cai,
      rangeStart: caiInfo.rangeStart,
      rangeEnd: caiInfo.rangeEnd,
      expiryDate: caiInfo.expiryDate,
      items: invoiceItems,
      subtotal: subtotal,
      totalTax: totalTax,
      total: total,
      creditApplied: creditApplied,
      creditCompIds: creditCompIds,
      notes: creditApplied > 0
        ? `Factura generada automáticamente. Crédito aplicado: L ${creditApplied.toLocaleString()}`
        : 'Factura generada automáticamente por el sistema',
      currency: 'HNL',
      taxRate: 15,
      status: 'ACTIVE',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return invoiceData;
  } catch (error) {
    console.error(`❌ Error generando factura para tenant ${tenant.id}:`, error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 POST /api/admin/billing/auto-generate-invoices - Iniciando generación automática...');
    
    // Opcional: Verificar autorización si no viene de cron job
    const { userId, sessionClaims } = await auth();
    
    // Obtener email y rol del usuario desde Clerk
    let email = '';
    let userRole: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        
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
    const isAuthorized = ['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) || isSuperAdminEmail;
    
    // Permitir también si viene con header de cron job (para servicios externos)
    const isCronJob = req.headers.get('x-cron-job') === 'true';
    
    if (!isAuthorized && !isCronJob) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener todos los tenants activos
    const { data: tenants, error: tenantsError } = await supabase
      .from('Tenant')
      .select('*')
      .eq('isactive', true);

    if (tenantsError) {
      console.error('❌ Error obteniendo tenants:', tenantsError);
      return NextResponse.json({ error: 'Error obteniendo tenants' }, { status: 500 });
    }

    console.log(`📦 Encontrados ${tenants?.length || 0} tenants activos`);

    const caiInfo = getSystemCAI();
    const generatedInvoices: any[] = [];
    const errors: any[] = [];

    // Generar factura para cada tenant
    for (const tenant of tenants || []) {
      try {
        // Verificar si ya existe una factura para este mes
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

        // Aquí deberíamos verificar en la base de datos si ya existe una factura
        // Por ahora, generamos la factura
        
        const invoice = await generateInvoiceForTenant(tenant, caiInfo);
        
        if (invoice) {
          generatedInvoices.push(invoice);
          // Marcar créditos usados como utilizados
          if (invoice.creditApplied > 0 && invoice.creditCompIds?.length > 0) {
            try {
              await supabase
                .from('TenantCompensation')
                .update({ used: true, usedat: new Date().toISOString() })
                .in('id', invoice.creditCompIds);
            } catch (e) {
              // 'used' column may not exist yet
            }
          }
          console.log(`✅ Factura generada para ${tenant.businessname}: ${invoice.invoiceNumber}${invoice.creditApplied > 0 ? ` (crédito: L${invoice.creditApplied})` : ''}`);
        }
      } catch (error) {
        console.error(`❌ Error procesando tenant ${tenant.id}:`, error);
        errors.push({ tenantId: tenant.id, error: (error as Error).message });
      }
    }

    console.log(`✅ Generación completada: ${generatedInvoices.length} facturas generadas`);

    return NextResponse.json({
      success: true,
      message: `Generación automática completada: ${generatedInvoices.length} facturas generadas`,
      invoices: generatedInvoices,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error en generación automática:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// También permitir GET para facilitar pruebas desde el navegador
export async function GET(req: NextRequest) {
  // Solo permitir en desarrollo o con autorización
  const { userId, sessionClaims } = await auth();
  
  let email = '';
  let userRole: string | undefined;
  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email = user.emailAddresses[0]?.emailAddress || '';
      
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
  const isAuthorized = ['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) || isSuperAdminEmail;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  // Redirigir a POST para ejecutar la generación
  return POST(req);
}
