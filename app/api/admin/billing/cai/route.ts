import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase-db';

export async function GET(
  req: NextRequest
) {
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

    const caiData = {
      id: activeCai.id,
      cai: activeCai.cai,
      rangeStart: Number(activeCai.rangeStart),
      rangeEnd: Number(activeCai.rangeEnd),
      currentNumber: Number(activeCai.currentNumber),
      expiryDate: activeCai.expiryDate,
      isActive: activeCai.isActive === true,
      isSystemWide: false,
      rtn: tenant?.businessrtn || '',
      businessName: tenant?.businessname || '',
      businessAddress: tenant?.businessaddress || '',
      establishmentCode: '',
      pointOfSaleCode: '',
      economicActivity: '',
      taxRate: 15,
      invoiceNumber: String(Number(activeCai.currentNumber) + 1),
      sequenceNumber: Number(activeCai.currentNumber) + 1
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