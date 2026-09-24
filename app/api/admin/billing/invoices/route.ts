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

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');
    const invoiceType = searchParams.get('type') || 'CUSTOMER';

    if (tenantId) {
      let tenantInvoices: any[] = [];

      // CONSULTAR FACTURAS DESDE BASE DE DATOS
      try {
        const { data: dbInvoices, error: dbError } = await supabase
          .from('Invoice')
          .select('*')
          .eq('tenantId', tenantId)
          .eq('invoiceType', invoiceType)
          .order('createdAt', { ascending: false });

        if (dbError) {
          console.error('❌ Error consultando base de datos:', dbError);
        } else {
          // Transformar datos de la base de datos al formato esperado
          tenantInvoices = dbInvoices.map((inv: any) => ({
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
        }
      } catch (error) {
        console.error('❌ Error en consulta de base de datos:', error);
      }

      // Aplicar paginación
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedInvoices = tenantInvoices.slice(startIndex, endIndex);

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
    const { userId } = await auth();

    // Handle JSON request
    const invoiceData = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Validar datos mínimos
    if (!invoiceData.tenantId || !invoiceData.items || !Array.isArray(invoiceData.items)) {
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
      return NextResponse.json(
        { error: 'Todos los items deben tener descripción, cantidad, precio unitario y total' },
        { status: 400 }
      );
    }

    // OBTENER CONFIGURACIÓN FISCAL EN TIEMPO REAL (desde base de datos)
    const fiscalConfig = await getCurrentFiscalConfig(supabase, invoiceData.tenantId);

    // OBTENER CAI ACTIVO EN TIEMPO REAL (desde base de datos)
    const activeCai = await getCurrentActiveCai(invoiceData.tenantId);

    if (!activeCai) {
      return NextResponse.json(
        { error: 'El tenant no tiene un CAI activo configurado' },
        { status: 400 }
      );
    }

    // Generar número de factura según formato SAR (con datos actualizados)
    const invoiceNumber = generateInvoiceNumberFromCurrentCai(activeCai);

    const generatedInvoice = {
      id: `INV-${Date.now()}`,
      tenantId: invoiceData.tenantId,
      invoiceNumber: invoiceNumber,
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

      // Información fiscal (CAI) - datos reales desde settings
      cai: activeCai?.cai || null,
      rangeStart: activeCai?.rangeStart !== undefined ? activeCai.rangeStart : null,
      rangeEnd: activeCai?.rangeEnd !== undefined ? activeCai.rangeEnd : null,
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
    let savedInvoice: any = null;
    let saveError: any = null;

    try {
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
        savedInvoice = insertedData?.[0] || generatedInvoice;

        // Guardar items si existen
        if (invoiceData.items && Array.isArray(invoiceData.items)) {
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
            saveError = itemsError;
          }
        }

        // INCREMENTAR NÚMERO DE CAI EN LA BASE DE DATOS
        if (activeCai) {
          await incrementCaiNumber(activeCai);
          console.log('🔄 Número de CAI incrementado para siguientes facturas');
        }
      }
    } catch (error) {
      console.error('❌ Error en guardado de base de datos:', error);
      saveError = error;
    }

    if (saveError) {
      console.error('❌ Error final guardando en base de datos:', saveError);
      return NextResponse.json(
        { error: 'Error al guardar la factura en la base de datos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice: generatedInvoice,
      message: 'Factura generada exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error generando factura:', error);

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
    const { userId, sessionClaims } = await auth();
    let userRole = (sessionClaims?.metadata as any)?.role;

    // Get email and role from Clerk user if not in sessionClaims
    let email = '';
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';

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
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Aceptar el id vía query param (?id=) o desde el body (invoiceId)
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');
    let bodyId: string | undefined;

    try {
      const body = await req.json();
      bodyId = body?.invoiceId;
    } catch (error) {
      // Sin body: usamos solo el query param
    }

    const invoiceId = queryId || bodyId;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Se requiere invoiceId' },
        { status: 400 }
      );
    }

    // Eliminar items asociados primero
    const { error: itemsError } = await supabase
      .from('InvoiceItem')
      .delete()
      .eq('invoiceId', invoiceId);

    if (itemsError) {
      console.error('❌ Error eliminando items de factura:', itemsError);
    }

    // Eliminar la factura
    const { data: deletedData, error: deleteError } = await supabase
      .from('Invoice')
      .delete()
      .eq('id', invoiceId)
      .select('id, invoiceNumber')
      .single();

    if (deleteError) {
      console.error('❌ Error eliminando factura:', deleteError);
      return NextResponse.json(
        { error: 'Factura no encontrada o no pudo eliminarse' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Factura eliminada exitosamente',
      deletedInvoice: deletedData
    });

  } catch (error: any) {
    console.error('❌ Error eliminando factura:', error);

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