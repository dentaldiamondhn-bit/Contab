import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

// Obtener el CAI del sistema configurado
function getSystemCAI() {
  // Aquí deberíamos obtener de la base de datos o configuración
  // Por ahora, usamos el CAI por defecto de ContabHN
  return {
    cai: 'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A',
    rangeStart: 1,
    rangeEnd: 1000,
    currentNumber: 1,
    expiryDate: '2024-12-31T23:59:59.000Z',
    rtn: '05011991078006',
    businessName: 'CONTAB HN',
    businessAddress: 'Tegucigalpa, Honduras',
    establishmentCode: '001',
    pointOfSaleCode: '001',
    economicActivity: '631100',
    taxRate: 15
  };
}

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

    console.log('CAI API - Auth check:', { userId, userRole, email, isAuthorized });

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Se requiere tenantId' }, { status: 400 });
    }

    console.log('🔍 Buscando CAI para tenant:', tenantId);

    // Obtener el CAI del sistema configurado
    const systemCaiConfig = getSystemCAI();
    console.log('✅ CAI del sistema obtenido:', systemCaiConfig);

    // Incrementar el número de factura para este tenant
    // En un caso real, esto debería persistirse en base de datos
    const nextInvoiceNumber = systemCaiConfig.currentNumber + 1;
    
    // Actualizar el número actual (simulado)
    systemCaiConfig.currentNumber = nextInvoiceNumber;

    console.log('📈 Número de factura incrementado a:', nextInvoiceNumber);

    return NextResponse.json({
      success: true,
      cai: {
        id: 'system-cai',
        cai: systemCaiConfig.cai,
        rangeStart: systemCaiConfig.rangeStart,
        rangeEnd: systemCaiConfig.rangeEnd,
        currentNumber: nextInvoiceNumber,
        expiryDate: systemCaiConfig.expiryDate,
        isActive: true,
        isSystemWide: true,
        rtn: systemCaiConfig.rtn,
        businessName: systemCaiConfig.businessName,
        businessAddress: systemCaiConfig.businessAddress,
        establishmentCode: systemCaiConfig.establishmentCode,
        pointOfSaleCode: systemCaiConfig.pointOfSaleCode,
        economicActivity: systemCaiConfig.economicActivity,
        taxRate: systemCaiConfig.taxRate,
        // Información adicional para la factura
        invoiceNumber: nextInvoiceNumber.toString(),
        sequenceNumber: nextInvoiceNumber
      }
    });

  } catch (error: any) {
    console.error('Error obteniendo CAI:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
