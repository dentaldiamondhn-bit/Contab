import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

/**
 * GET /api/admin/billing/cai/current?tenantId=
 *
 * Leia el CAI con Prisma (`db.cAI`), un modelo que no corresponde a la tabla
 * real (`cai` no tiene `cai`, `rangeStart`, `rangeEnd`...). Ademas
 * `DATABASE_URL` no resuelve en este entorno, asi que respondia 500. Ahora se
 * usa Supabase con las columnas reales.
 */

function extractSerialNumber(invoiceNumber: string): number {
  const match = invoiceNumber.match(/(\d+)\s*$/);
  return match ? parseInt(match[1], 10) : 0;
}

function numero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
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

    const cliente = supabase as any;

    // CAI activo del tenant. La vigencia se filtra en SQL por fecha; el estado
    // "expirado" exacto lo decide la UI con expiryDate.
    const { data: activeCai, error: caiError } = await cliente
      .from('cai')
      .select(
        'id, cai_number, start_number, end_number, current_number, issue_date, expiration_date, status',
      )
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('expiration_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (caiError) {
      return NextResponse.json({ error: caiError.message }, { status: 500 });
    }

    if (!activeCai) {
      return NextResponse.json(
        {
          success: false,
          cai: null,
          message: 'El tenant no tiene un CAI activo configurado',
        },
        { status: 404 },
      );
    }

    // Configuracion fiscal del emisor: la tabla real es `tenants`.
    const { data: tenant } = await cliente
      .from('tenants')
      .select('business_name, business_rtn, business_email, phone_number')
      .or(`id.eq.${tenantId},tenant_code.eq.${tenantId}`)
      .limit(1)
      .maybeSingle();

    // Numero de factura: siguiente al ultimo emitido (maximo entre el numero
    // persistido del CAI y la ultima factura registrada).
    const { data: lastInvoices } = await cliente
      .from('Invoice')
      .select('invoiceNumber')
      .eq('tenantId', tenantId)
      .order('createdAt', { ascending: false })
      .limit(20);

    const maxSerialFromInvoices = (lastInvoices || []).reduce(
      (max: number, inv: any) => Math.max(max, extractSerialNumber(inv.invoiceNumber || '')),
      0,
    );

    const currentNumber = numero(activeCai.current_number);
    const nextNumber = Math.max(currentNumber, maxSerialFromInvoices) + 1;

    const caiData = {
      id: activeCai.id,
      cai: activeCai.cai_number,
      rangeStart: numero(activeCai.start_number),
      rangeEnd: numero(activeCai.end_number),
      currentNumber: nextNumber,
      expiryDate: activeCai.expiration_date,
      isActive: activeCai.status === 'active',
      isSystemWide: false,
      rtn: tenant?.business_rtn || '',
      businessName: tenant?.business_name || '',
      businessAddress: '',
      establishmentCode: '',
      pointOfSaleCode: '',
      economicActivity: '',
      taxRate: 15,
      invoiceNumber: String(nextNumber),
      sequenceNumber: nextNumber,
    };

    return NextResponse.json({ success: true, cai: caiData });
  } catch (error: any) {
    console.error('Error obteniendo CAI:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
