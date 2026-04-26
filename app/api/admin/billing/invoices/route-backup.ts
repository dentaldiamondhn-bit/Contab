import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// Memoria temporal para simular persistencia de facturas
let generatedInvoices: any[] = [];

export async function GET(req: NextRequest) {
  try {
    console.log('🔄 GET /api/admin/billing/invoices - Iniciando...');
    
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
      console.log('❌ No autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    console.log('✅ Usuario autorizado:', email);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');

    console.log('📋 Parámetros:', { tenantId, page, limit, status });

    if (tenantId) {
      // Filtrar facturas por tenantId
      const tenantInvoices = generatedInvoices.filter(invoice => invoice.tenantId === tenantId);
      
      // Aplicar paginación
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedInvoices = tenantInvoices.slice(startIndex, endIndex);
      
      console.log('📦 Facturas encontradas:', tenantInvoices.length);
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
      console.log('❌ No autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    console.log('✅ Usuario autorizado:', email);

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
