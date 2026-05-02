import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

// Memoria temporal para simular persistencia de facturas
let generatedInvoices: any[] = [];

// Tipos de facturas
enum InvoiceType {
  SUBSCRIPTION = 'SUBSCRIPTION',    // ContabHN factura al tenant
  CUSTOMER = 'CUSTOMER',          // Tenant factura a sus clientes
  EXPENSE = 'EXPENSE'             // Tenant recibe facturas de proveedores
}

// Función para generar facturas mensuales basadas en los planes del tenant
async function generateMonthlyInvoices(tenantId: string) {
  try {
    // Obtener datos del tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('Tenant')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.log('❌ Tenant no encontrado:', tenantError);
      return [];
    }

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

    // Obtener módulos del tenant
    const modules = tenant.modules ? tenant.modules.split(',').filter((m: string) => m.trim()) : [];

    // Precios de planes
    const planPrices: Record<string, number> = {
      'BASICO': 500,
      'PREMIUM': 1000,
      'ENTERPRISE': 2000,
      'STARTER': 200,
      'GROWTH': 750
    };

    // Generar facturas para los últimos 12 meses (solo tipo SUBSCRIPTION)
    const invoices = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const invoiceDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = invoiceDate.toLocaleString('es-HN', { month: 'long', year: 'numeric' });
      
      // Calcular total basado en planes
      let subtotal = 0;
      const items: any[] = [];
      
      // Agregar items por cada plan
      subscriptionPlans.forEach((plan: any) => {
        const planPrice = planPrices[plan.code] || 0;
        subtotal += planPrice * plan.quantity;
        items.push({
          description: `Plan ${plan.code} - ${plan.quantity} licencia(s)`,
          quantity: plan.quantity,
          unitPrice: planPrice,
          total: planPrice * plan.quantity
        });
      });
      
      // Agregar items por cada módulo
      modules.forEach((module: string) => {
        const modulePrice = 50; // Precio fijo por módulo
        subtotal += modulePrice;
        items.push({
          description: `Módulo ${module}`,
          quantity: 1,
          unitPrice: modulePrice,
          total: modulePrice
        });
      });
      
      const taxRate = 0.15; // 15% ISV
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;
      
      invoices.push({
        id: `sub-${tenantId}-${i}`,
        invoiceNumber: `SUB-${tenantId}-${String(i + 1).padStart(3, '0')}`,
        invoiceType: InvoiceType.SUBSCRIPTION,
        customerName: tenant.businessname || 'Empresa Demo',
        customerRTN: tenant.businessrtn || '0000-0000-0000-0',
        customerEmail: tenant.businessemail || 'demo@contabhn.com',
        issuerName: 'ContabHN',
        issuerRTN: '08011989237960',
        items: items,
        subtotal: subtotal,
        totalTax: taxAmount,
        total: total,
        taxRate: taxRate * 100,
        status: i === 0 ? 'ACTIVE' : 'PAID',
        createdAt: invoiceDate.toISOString()
      });
    }

    return invoices;
  } catch (error) {
    console.error('❌ Error generating monthly invoices:', error);
    return [];
  }
}

// Generar facturas del tenant a clientes (mock data)
function generateCustomerInvoices(tenantId: string) {
  const customerInvoices = [
    {
      id: `cust-${tenantId}-1`,
      invoiceNumber: `CUST-${tenantId}-001`,
      invoiceType: InvoiceType.CUSTOMER,
      customerName: 'Cliente Ejemplo S.A.',
      customerRTN: '0801-2000-12345',
      customerEmail: 'cliente@ejemplo.com',
      issueDate: '2026-04-15',
      dueDate: '2026-05-15',
      subtotal: 5000,
      tax: 750,
      total: 5750,
      status: 'PAID',
      items: [
        {
          id: 'item1',
          description: 'Servicios de Consultoría IT',
          quantity: 10,
          unitPrice: 500,
          total: 5000
        }
      ]
    },
    {
      id: `cust-${tenantId}-2`,
      invoiceNumber: `CUST-${tenantId}-002`,
      invoiceType: InvoiceType.CUSTOMER,
      customerName: 'Empresa Cliente 2',
      customerRTN: '0801-2000-67890',
      customerEmail: 'facturacion@cliente2.com',
      issueDate: '2026-04-20',
      dueDate: '2026-05-20',
      subtotal: 2500,
      tax: 375,
      total: 2875,
      status: 'PENDING',
      items: [
        {
          id: 'item2',
          description: 'Mantenimiento Preventivo',
          quantity: 5,
          unitPrice: 500,
          total: 2500
        }
      ]
    }
  ];
  
  return customerInvoices;
}

// Generar facturas recibidas por el tenant (mock data)
function generateExpenseInvoices(tenantId: string) {
  const expenseInvoices = [
    {
      id: `exp-${tenantId}-1`,
      invoiceNumber: `EXP-${tenantId}-001`,
      invoiceType: InvoiceType.EXPENSE,
      customerName: 'Microsoft Corporation',
      customerRTN: '99-999-9999',
      customerEmail: 'billing@microsoft.com',
      issueDate: '2026-04-10',
      dueDate: '2026-04-30',
      subtotal: 1200,
      tax: 180,
      total: 1380,
      status: 'PAID',
      items: [
        {
          id: 'exp1',
          description: 'Suscripción Office 365 Business',
          quantity: 1,
          unitPrice: 1200,
          total: 1200
        }
      ]
    },
    {
      id: `exp-${tenantId}-2`,
      invoiceNumber: `EXP-${tenantId}-002`,
      invoiceType: InvoiceType.EXPENSE,
      customerName: 'Amazon Web Services',
      customerRTN: '99-888-8888',
      customerEmail: 'aws@amazon.com',
      issueDate: '2026-04-15',
      dueDate: '2026-05-15',
      subtotal: 850,
      tax: 127.50,
      total: 977.50,
      status: 'PENDING',
      items: [
        {
          id: 'exp2',
          description: 'Servicios AWS EC2 y S3',
          quantity: 1,
          unitPrice: 850,
          total: 850
        }
      ]
    }
  ];
  
  return expenseInvoices;
}

export async function GET(req: NextRequest) {
  try {
    console.log('🔄 GET /api/admin/billing/invoices - Iniciando...');
    
    const { userId, sessionClaims } = await auth();
    let userRole = (sessionClaims?.metadata as any)?.role;

    // Get email and role from Clerk user if not in sessionClaims
    let email = '';
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        
        // Get role from Clerk metadata if not in sessionClaims
        if (!userRole) {
          userRole = user.publicMetadata?.role || 
                     user.unsafeMetadata?.role || 
                     (user.privateMetadata as any)?.role;
        }
      } catch (error) {
        console.error('Error getting user from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    // Permitir acceso a SUPER_ADMIN, SUPPORT, ADMIN (tenant admin), y MANAGER
    const allowedRoles = ['SUPER_ADMIN', 'SUPPORT', 'ADMIN', 'MANAGER'];
    if (!userId || (!allowedRoles.includes(userRole as string) && !isSuperAdminEmail)) {
      console.log('❌ No autorizado - role:', userRole, 'email:', email);
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    console.log('✅ Usuario autorizado:', email, 'role:', userRole);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');
    const invoiceType = searchParams.get('type') || 'CUSTOMER'; // Default: facturas del tenant a clientes

    console.log('📋 Parámetros:', { tenantId, page, limit, status, invoiceType });

    if (tenantId) {
      let tenantInvoices: any[] = [];
      
      if (invoiceType === 'SUBSCRIPTION') {
        // Facturas de ContabHN al tenant
        tenantInvoices = await generateMonthlyInvoices(tenantId);
      } else if (invoiceType === 'CUSTOMER') {
        // Facturas del tenant a sus clientes (mock data)
        tenantInvoices = generateCustomerInvoices(tenantId);
      } else if (invoiceType === 'EXPENSE') {
        // Facturas recibidas por el tenant (mock data)
        tenantInvoices = generateExpenseInvoices(tenantId);
      }
      
      // Aplicar paginación
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedInvoices = tenantInvoices.slice(startIndex, endIndex);
      
      console.log('📦 Facturas generadas:', tenantInvoices.length);
      console.log('📄 Facturas devueltas:', paginatedInvoices.length);

      return NextResponse.json({
        success: true,
        invoices: paginatedInvoices,
        pagination: {
          page,
          limit,
          total: tenantInvoices.length,
          totalPages: Math.ceil(tenantInvoices.length / limit)
        }
      });
    } else {
      // Get all invoices (for admin dashboard)
      console.log('📄 Todas las facturas:', generatedInvoices.length);
      return NextResponse.json({
        success: true,
        invoices: generatedInvoices,
        message: 'Por favor especifica un tenantId para ver las facturas de un tenant específico'
      });
    }

  } catch (error: any) {
    console.error('❌ Error obteniendo facturas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 POST /api/admin/billing/invoices - Iniciando...');
    
    const { userId, sessionClaims } = await auth();
    let userRole = (sessionClaims?.metadata as any)?.role;

    // Get email and role from Clerk user if not in sessionClaims
    let email = '';
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        
        // Get role from Clerk metadata if not in sessionClaims
        if (!userRole) {
          userRole = user.publicMetadata?.role || 
                     user.unsafeMetadata?.role || 
                     (user.privateMetadata as any)?.role;
        }
      } catch (error) {
        console.error('Error getting user from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    // Permitir acceso a SUPER_ADMIN, SUPPORT, ADMIN (tenant admin), y MANAGER
    const allowedRoles = ['SUPER_ADMIN', 'SUPPORT', 'ADMIN', 'MANAGER'];
    if (!userId || (!allowedRoles.includes(userRole as string) && !isSuperAdminEmail)) {
      console.log('❌ No autorizado - role:', userRole, 'email:', email);
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    console.log('✅ Usuario autorizado:', email, 'role:', userRole);

    // Parse request body
    const invoiceData = await req.json();
    console.log('📦 Datos de factura recibidos:', invoiceData);

    // Validar datos mínimos
    if (!invoiceData.tenantId || !invoiceData.invoiceNumber || !invoiceData.items || !Array.isArray(invoiceData.items)) {
      console.log('❌ Datos inválidos');
      return NextResponse.json(
        { error: 'Datos de factura inválidos' },
        { status: 400 }
      );
    }

    // Generar factura (simulado por ahora)
    console.log('📄 Generando factura...');
    
    const generatedInvoice = {
      id: `INV-${Date.now()}`,
      tenantId: invoiceData.tenantId,
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: invoiceData.invoiceDate,
      customerId: invoiceData.customerId,
      customerRTN: invoiceData.customerRTN,
      customerName: invoiceData.customerName,
      customerAddress: invoiceData.customerAddress,
      issuerRTN: invoiceData.issuerRTN,
      issuerName: invoiceData.issuerName,
      issuerAddress: invoiceData.issuerAddress,
      cai: invoiceData.cai,
      rangeStart: invoiceData.rangeStart,
      rangeEnd: invoiceData.rangeEnd,
      expiryDate: invoiceData.expiryDate,
      items: invoiceData.items,
      subtotal: invoiceData.subtotal,
      totalTax: invoiceData.totalTax,
      total: invoiceData.total,
      notes: invoiceData.notes,
      currency: invoiceData.currency || 'HNL',
      taxRate: invoiceData.taxRate,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Guardar en memoria compartida
    generatedInvoices.push(generatedInvoice);
    console.log('💾 Factura guardada en memoria:', generatedInvoice);
    console.log('📊 Total de facturas en memoria:', generatedInvoices.length);

    return NextResponse.json({
      success: true,
      invoice: generatedInvoice,
      message: 'Factura generada exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error generando factura:', error);
    
    // Si hay error de parseo JSON
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return NextResponse.json(
        { error: 'Error en el formato de los datos enviados' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    console.log('🔄 DELETE /api/admin/billing/invoices - Iniciando...');
    
    const { userId, sessionClaims } = await auth();
    let userRole = (sessionClaims?.metadata as any)?.role;

    // Get email and role from Clerk user if not in sessionClaims
    let email = '';
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        
        // Get role from Clerk metadata if not in sessionClaims
        if (!userRole) {
          userRole = user.publicMetadata?.role || 
                     user.unsafeMetadata?.role || 
                     (user.privateMetadata as any)?.role;
        }
      } catch (error) {
        console.error('Error getting user from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    // Permitir acceso a SUPER_ADMIN, SUPPORT, ADMIN (tenant admin), y MANAGER
    const allowedRoles = ['SUPER_ADMIN', 'SUPPORT', 'ADMIN', 'MANAGER'];
    if (!userId || (!allowedRoles.includes(userRole as string) && !isSuperAdminEmail)) {
      console.log('❌ No autorizado - role:', userRole, 'email:', email);
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    console.log('✅ Usuario autorizado:', email, 'role:', userRole);

    // Parse request body
    const body = await req.json();
    const { invoiceId } = body;

    console.log('🗑️ Eliminando factura:', invoiceId);

    // Validar que se proporcionó invoiceId
    if (!invoiceId) {
      console.log('❌ No se proporcionó invoiceId');
      return NextResponse.json(
        { error: 'Se requiere invoiceId' },
        { status: 400 }
      );
    }

    // Buscar y eliminar la factura en memoria
    const invoiceIndex = generatedInvoices.findIndex(inv => inv.id === invoiceId);
    
    if (invoiceIndex === -1) {
      console.log('❌ Factura no encontrada:', invoiceId);
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar la factura
    const deletedInvoice = generatedInvoices[invoiceIndex];
    generatedInvoices.splice(invoiceIndex, 1);
    
    console.log('✅ Factura eliminada:', deletedInvoice);
    console.log('📊 Total de facturas en memoria:', generatedInvoices.length);

    return NextResponse.json({
      success: true,
      message: 'Factura eliminada exitosamente',
      deletedInvoice: deletedInvoice
    });

  } catch (error: any) {
    console.error('❌ Error eliminando factura:', error);
    
    // Si hay error de parseo JSON
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return NextResponse.json(
        { error: 'Error en el formato de los datos enviados' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
