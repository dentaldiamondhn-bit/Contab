import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

/**
 * GET /api/admin/billing/cai?tenantId=
 *
 * Usaba Prisma (`db.cAI`), cuyo modelo no corresponde a la tabla real y cuya
 * conexion no resuelve en este entorno. Se lee `cai` con Supabase.
 */

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

    let userRole: string | undefined;
    let email: string | undefined;

    try {
      const user = await currentUser();
      userRole = (user?.publicMetadata as any)?.role;
      email = user?.emailAddresses?.[0]?.emailAddress;
    } catch (error) {
      console.error('Error getting user from Clerk:', error);
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
    const isAuthorized = ['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) || isSuperAdminEmail;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Se requiere tenantId' }, { status: 400 });
    }

    const cliente = supabase as any;

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

    const { data: tenant } = await cliente
      .from('tenants')
      .select('business_name, business_rtn, business_email, phone_number')
      .or(`id.eq.${tenantId},tenant_code.eq.${tenantId}`)
      .limit(1)
      .maybeSingle();

    const currentNumber = numero(activeCai.current_number);

    const caiData = {
      id: activeCai.id,
      cai: activeCai.cai_number,
      rangeStart: numero(activeCai.start_number),
      rangeEnd: numero(activeCai.end_number),
      currentNumber,
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
      invoiceNumber: String(currentNumber + 1),
      sequenceNumber: currentNumber + 1,
    };

    return NextResponse.json({ success: true, cai: caiData });
  } catch (error: any) {
    console.error('Error obteniendo CAI:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
