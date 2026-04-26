import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  req: NextRequest
) {
  try {
    console.log('🔄 GET /api/admin/billing/cai/current - Iniciando...');
    
    const { userId } = await auth();

    // Verificar autorización básica
    if (!userId) {
      console.log('❌ No userId provided');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('✅ Usuario autenticado:', userId);

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    console.log('📋 TenantId:', tenantId);

    if (!tenantId) {
      return NextResponse.json({ error: 'Se requiere tenantId' }, { status: 400 });
    }

    // CAI del sistema (datos por ahora, luego vendrán de la configuración)
    const caiData = {
      id: 'system-cai',
      cai: 'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A',
      rangeStart: 1,
      rangeEnd: 50,
      currentNumber: Math.floor(Math.random() * 10) + 1, // Número aleatorio para demo
      expiryDate: '2026-12-31T23:59:59.000Z',
      isActive: true,
      isSystemWide: true,
      // Información fiscal del emisor
      rtn: '05011991078006',
      businessName: 'CONTAB HN',
      businessAddress: 'Tegucigalpa, Honduras',
      establishmentCode: '001',
      pointOfSaleCode: '001',
      economicActivity: '631100',
      taxRate: 15,
      // Información adicional para la factura
      invoiceNumber: Math.floor(Math.random() * 10) + 1,
      sequenceNumber: Math.floor(Math.random() * 10) + 1
    };

    console.log('✅ CAI generado:', caiData);

    return NextResponse.json({
      success: true,
      cai: caiData
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo CAI:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
