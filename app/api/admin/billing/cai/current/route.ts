import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase-db';

function extractSerialNumber(invoiceNumber: string): number {
  const match = invoiceNumber.match(/(\d+)\s*$/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function GET(
  req: NextRequest
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Se requiere tenantId' }, { status: 400 });
    }

    // Obtener el CAI activo real del tenant desde la base de datos
    const activeCai = await (db as any).cAI.findFirst({
      where: {
        tenantId: tenantId,
        isActive: true,
        expiryDate: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeCai) {
      return NextResponse.json({
        success: false,
        cai: null,
        message: 'El tenant no tiene un CAI activo configurado'
      }, { status: 404 });
    }

    // Obtener la configuración fiscal real del tenant
    const { data: tenant } = await supabase
      .from('Tenant')
      .select('businessname, businessrtn, businessaddress, businessemail, phonenumber')
      .eq('id', tenantId)
      .single();

    // Número de factura: siguiente al último emitido (máximo entre el número
    // actual persistido del CAI y la última factura registrada en la BD)
    const { data: lastInvoices } = await (supabase as any)
      .from('Invoice')
      .select('invoiceNumber')
      .eq('tenantId', tenantId)
      .order('createdAt', { ascending: false })
      .limit(20);

    const maxSerialFromInvoices = (lastInvoices || []).reduce(
      (max: number, inv: any) => Math.max(max, extractSerialNumber(inv.invoiceNumber || '')),
      0
    );

    const currentNumber = Number(activeCai.currentNumber);
    const nextNumber = Math.max(currentNumber, maxSerialFromInvoices) + 1;

    const caiData = {
      id: activeCai.id,
      cai: activeCai.cai,
      rangeStart: Number(activeCai.rangeStart),
      rangeEnd: Number(activeCai.rangeEnd),
      currentNumber: nextNumber,
      expiryDate: activeCai.expiryDate,
      isActive: activeCai.isActive === true,
      isSystemWide: false,
      // Información fiscal del emisor (real del tenant)
      rtn: tenant?.businessrtn || '',
      businessName: tenant?.businessname || '',
      businessAddress: tenant?.businessaddress || '',
      establishmentCode: '',
      pointOfSaleCode: '',
      economicActivity: '',
      taxRate: 15,
      // Información adicional para la factura
      invoiceNumber: String(nextNumber),
      sequenceNumber: nextNumber
    };

    return NextResponse.json({
      success: true,
      cai: caiData
    });

  } catch (error: any) {
    console.error('Error obteniendo CAI:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}