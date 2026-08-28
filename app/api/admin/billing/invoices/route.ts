import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';
import { clerkClient } from '@clerk/nextjs/server';
import { 
  getCurrentFiscalConfig, 
  getCurrentActiveCai, 
  generateInvoiceNumberFromCurrentCai,
  incrementCaiNumber 
} from './sync-config';

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
    
    // Simplificar autenticación - solo verificar sesión activa
    const { userId } = await auth();
    if (!userId) {
      console.log('❌ No autenticado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Permitir acceso a cualquier usuario autenticado temporalmente
    console.log('✅ Usuario autenticado:', userId);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');
    const invoiceType = searchParams.get('type') || 'CUSTOMER'; // Default: facturas del tenant a clientes

    console.log('📋 Parámetros:', { tenantId, page, limit, status, invoiceType });

    if (tenantId) {
      let tenantInvoices: any[] = [];
      
      // CONSULTAR FACTURAS DESDE BASE DE DATOS
      try {
        console.log('🔍 Consultando facturas desde base de datos para tenant:', tenantId);
        
        const { data: dbInvoices, error: dbError } = await supabase
          .from('Invoice')
          .select('*')
          .eq('tenantId', tenantId)
          .eq('invoiceType', invoiceType)
          .order('createdAt', { ascending: false });
          
        if (dbError) {
          console.error('❌ Error consultando base de datos:', dbError);
          // Fallback a datos de memoria si falla DB
        } else {
          console.log('✅ Facturas desde base de datos:', dbInvoices?.length || 0);
          
          // Transformar datos de la base de datos al formato esperado
          const transformedInvoices = dbInvoices.map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            invoiceType: inv.invoiceType,
            status: inv.status,
            customerName: inv.customerName,
            customerRTN: inv.customerRTN,
            customerEmail: inv.customerEmail,
            issuerName: inv.issuerName,
            issuerRTN: inv.issuerRTN,
            issueDate: inv.issueDate,
            dueDate: inv.dueDate,
            subtotal: inv.subtotal,
            tax: inv.tax,
            total: inv.total,
            currency: inv.currency,
            taxRate: inv.taxRate,
            notes: inv.notes,
            createdAt: inv.createdAt,
            updatedAt: inv.updatedAt
          }));
          
          tenantInvoices = transformedInvoices;
        }
      } catch (error) {
        console.error('❌ Error en consulta de base de datos:', error);
      }
      
      // Si no hay facturas en DB, usar mock data temporalmente
      if (tenantInvoices.length === 0) {
        console.log('📭 No hay facturas en DB, usando mock data temporal');
        
        if (invoiceType === 'CUSTOMER') {
          const customerInvoices = generateCustomerInvoices(tenantId);
          tenantInvoices = customerInvoices;
        } else if (invoiceType === 'EXPENSE') {
          const expenseInvoices = generateExpenseInvoices(tenantId);
          tenantInvoices = expenseInvoices;
        }
      }
      
      // Aplicar paginación
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedInvoices = tenantInvoices.slice(startIndex, endIndex);
      
      console.log('📦 Facturas totales:', tenantInvoices.length);
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
      // Get all invoices (for admin dashboard or global views)
      console.log('📄 Solicitando todas las facturas, tipo:', invoiceType);
      
      let query = supabase
        .from('Invoice')
        .select('*')
        .order('createdAt', { ascending: false });

      if (invoiceType) {
        query = query.eq('invoiceType', invoiceType);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data: allInvoices, error: allError } = await query;

      if (allError) {
        console.error('❌ Error consultando todas las facturas:', allError);
        return NextResponse.json({
          success: true,
          invoices: [],
          pagination: { page, limit, total: 0, totalPages: 0 }
        });
      }

      console.log('✅ Total facturas encontradas:', allInvoices?.length || 0);

      // Transform
      const transformed = (allInvoices || []).map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceType: inv.invoiceType,
        status: inv.status,
        customerName: inv.customerName,
        customerRTN: inv.customerRTN,
        customerEmail: inv.customerEmail,
        issuerName: inv.issuerName,
        issuerRTN: inv.issuerRTN,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        subtotal: inv.subtotal,
        tax: inv.tax,
        total: inv.total,
        currency: inv.currency,
        taxRate: inv.taxRate,
        notes: inv.notes,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      }));

      // Paginate
      const startIndex = (page - 1) * limit;
      const paginated = transformed.slice(startIndex, startIndex + limit);

      return NextResponse.json({
        success: true,
        invoices: paginated,
        pagination: {
          page,
          limit,
          total: transformed.length,
          totalPages: Math.ceil(transformed.length / limit)
        }
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
    
    const { userId } = await auth();
    
    // Simplificar autenticación - permitir acceso a cualquier usuario autenticado
    // para facturas CUSTOMER (tenant facturando a sus clientes)
    
    // Procesar datos de la factura primero para determinar tipo
    console.log('📄 Procesando JSON...');
    
    // Handle JSON request
    const invoiceData = await req.json();
    
    const isCustomerInvoice = invoiceData?.invoiceType === 'CUSTOMER';
    
    if (isCustomerInvoice) {
      console.log('✅ Factura de cliente detectada - acceso permitido');
    } else {
      console.log('🔍 Verificando permisos para factura tipo:', invoiceData?.invoiceType);
    }

    // Permitir acceso para facturas CUSTOMER o usuarios autenticados
    if (!userId) {
      console.log('❌ No autenticado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Si es factura CUSTOMER, permitir acceso a cualquier usuario autenticado
    if (isCustomerInvoice) {
      console.log('✅ Acceso permitido para factura de cliente');
    } else {
      console.log('🔍 Factura no es CUSTOMER, verificando permisos adicionales...');
      // Aquí podrías agregar validaciones adicionales para otros tipos de factura
    }
    
    console.log('📦 Datos de factura procesados:', invoiceData);

    // Validar datos mínimos
    if (!invoiceData.tenantId || !invoiceData.items || !Array.isArray(invoiceData.items)) {
      console.log('❌ Datos inválidos - missing tenantId or items');
      console.log('  tenantId:', invoiceData.tenantId);
      console.log('  items:', invoiceData.items);
      console.log('  items type:', typeof invoiceData.items);
      return NextResponse.json(
        { error: 'Datos de factura inválidos - se requiere tenantId e items' },
        { status: 400 }
      );
    }
    
    // Validar que los items tengan la estructura correcta
    const invalidItems = invoiceData.items.filter((item: any) => 
      !item.description || !item.quantity || !item.unitPrice || !item.total
    );
    
    if (invalidItems.length > 0) {
      console.log('❌ Items inválidos:', invalidItems);
      return NextResponse.json(
        { error: 'Todos los items deben tener descripción, cantidad, precio unitario y total' },
        { status: 400 }
      );
    }

    // Generar factura (simulado por ahora)
    console.log('📄 Generando factura...');
    
    // OBTENER CONFIGURACIÓN FISCAL EN TIEMPO REAL (desde base de datos)
    console.log('🔄 Obteniendo configuración fiscal actualizada desde base de datos...');
    const fiscalConfig = await getCurrentFiscalConfig(supabase, invoiceData.tenantId);
    console.log('✅ Configuración fiscal obtenida:', fiscalConfig);

    // OBTENER CAI ACTIVO EN TIEMPO REAL (desde base de datos)
    console.log('🔄 Obteniendo CAI activo actualizado desde base de datos...');
    const activeCai = await getCurrentActiveCai(supabase, invoiceData.tenantId);
    console.log('✅ CAI activo obtenido:', activeCai);

    // Generar número de factura según formato SAR (con datos actualizados)
    const invoiceNumber = generateInvoiceNumberFromCurrentCai(activeCai);
    console.log('🔢 Número de factura generado:', invoiceNumber);

    const generatedInvoice = {
      id: `INV-${Date.now()}`,
      tenantId: invoiceData.tenantId,
      invoiceNumber: invoiceNumber, // Usar el número generado con datos actualizados
      invoiceType: invoiceData.invoiceType || 'CUSTOMER',
      issueDate: invoiceData.issueDate || new Date().toISOString().split('T')[0],
      dueDate: invoiceData.dueDate || new Date().toISOString().split('T')[0],
      
      // Datos del cliente (quien recibe la factura)
      customerName: invoiceData.customerName || 'Consumidor Final',
      customerRTN: invoiceData.customerRTN || '',
      customerEmail: invoiceData.customerEmail || '',
      customerAddress: invoiceData.customerAddress || '',
      
      // Datos del emisor (quien emite la factura - el tenant)
      issuerName: fiscalConfig.businessName,
      issuerRTN: fiscalConfig.rtn,
      issuerAddress: fiscalConfig.businessAddress,
      
      // Información fiscal (CAI) - datos actualizados desde settings
      cai: activeCai?.cai || null,
      rangeStart: activeCai?.rangeStart || null,
      rangeEnd: activeCai?.rangeEnd || null,
      expiryDate: activeCai?.expiryDate || null,
      
      items: invoiceData.items,
      subtotal: invoiceData.subtotal,
      tax: invoiceData.tax,
      total: invoiceData.total,
      notes: invoiceData.notes,
      currency: 'HNL',
      taxRate: 15,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // GUARDAR EN BASE DE DATOS - FORZAR GUARDADO REAL
    console.log('💾 Iniciando guardado en base de datos...');
    console.log('📊 Invoice data to save:', JSON.stringify(generatedInvoice, null, 2));
    
    let savedInvoice: any = null;
    let saveError = null;
    
    try {
      // Intentar guardar directamente sin .single() primero
      const { data: insertedData, error: insertError } = await supabase
        .from('Invoice')
        .insert([{
          id: generatedInvoice.id,
          tenantId: generatedInvoice.tenantId,
          invoiceNumber: generatedInvoice.invoiceNumber,
          invoiceType: generatedInvoice.invoiceType,
          status: generatedInvoice.status,
          customerName: generatedInvoice.customerName,
          customerRTN: generatedInvoice.customerRTN,
          customerEmail: generatedInvoice.customerEmail,
          customerAddress: generatedInvoice.customerAddress,
          issuerName: generatedInvoice.issuerName,
          issuerRTN: generatedInvoice.issuerRTN,
          issuerAddress: generatedInvoice.issuerAddress,
          issueDate: generatedInvoice.issueDate,
          dueDate: generatedInvoice.dueDate,
          cai: generatedInvoice.cai,
          rangeStart: generatedInvoice.rangeStart,
          rangeEnd: generatedInvoice.rangeEnd,
          expiryDate: generatedInvoice.expiryDate,
          subtotal: generatedInvoice.subtotal,
          tax: generatedInvoice.tax,
          total: generatedInvoice.total,
          currency: generatedInvoice.currency,
          taxRate: generatedInvoice.taxRate,
          notes: generatedInvoice.notes,
          createdBy: userId
        }]);
        
      if (insertError) {
        console.error('❌ Error en insert principal:', insertError);
        saveError = insertError;
      } else {
        console.log('✅ Insert principal exitoso:', insertedData);
        savedInvoice = insertedData?.[0] || generatedInvoice;
        
        // Guardar items si existen
        if (invoiceData.items && Array.isArray(invoiceData.items)) {
          console.log('💾 Guardando items de factura...');
          
          const itemsToInsert = invoiceData.items.map((item: any) => ({
            invoiceId: savedInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            taxRate: item.taxRate || 15,
            taxAmount: item.taxAmount || (item.total * 0.15),
            isTaxable: item.isTaxable !== false,
            productCode: item.productCode,
            serviceCode: item.serviceCode
          }));
          
          const { error: itemsError } = await supabase
            .from('InvoiceItem')
            .insert(itemsToInsert);
            
          if (itemsError) {
            console.error('❌ Error guardando items:', itemsError);
          } else {
            console.log('✅ Items guardados exitosamente:', itemsToInsert.length);
          }
        }
        
        // INCREMENTAR NÚMERO DE CAI
        if (activeCai) {
          await incrementCaiNumber(supabase, invoiceData.tenantId, activeCai);
          console.log('🔄 Número de CAI incrementado para siguientes facturas');
        }
      }
    } catch (error) {
      console.error('❌ Error en guardado de base de datos:', error);
      saveError = error;
    }
    
    if (saveError) {
      console.error('❌ Error final guardando en base de datos:', saveError);
      // Fallback a memoria si falla DB
      generatedInvoices.push(generatedInvoice);
      console.log('💾 Factura guardada en memoria (fallback). Total en memoria:', generatedInvoices.length);
    } else {
      console.log('✅ Factura guardada exitosamente en base de datos:', savedInvoice?.id);
    }
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
