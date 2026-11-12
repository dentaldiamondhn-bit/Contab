import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

/**
 * GET /api/billing/cai/tenant/[tenantId]
 *
 * Usaba Prisma (`db.cAI`) con columnas inexistentes y `params` sincronico (en
 * Next 16 es una Promise). Ahora lee la tabla `cai` real con Supabase.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { tenantId } = await params;

    const tenantDeSesion = request.headers.get('x-tenant-id');
    if (tenantDeSesion && tenantDeSesion !== tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { data: activeCai, error } = await (getSupabaseServer() as any)
      .from('cai')
      .select('id, cai_number, start_number, end_number, current_number, issue_date, expiration_date, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!activeCai) {
      return NextResponse.json(
        {
          success: false,
          message: 'El tenant no tiene CAI activo configurado',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cai: {
        id: activeCai.id,
        cai: activeCai.cai_number,
        rangeStart: Number(activeCai.start_number),
        rangeEnd: Number(activeCai.end_number),
        currentNumber: Number(activeCai.current_number),
        expiryDate: activeCai.expiration_date
          ? String(activeCai.expiration_date).split('T')[0]
          : '',
        issueDate: activeCai.issue_date ? String(activeCai.issue_date).split('T')[0] : '',
        isActive: activeCai.status === 'active',
        establishmentCode: '001',
        pointOfSaleCode: '001',
        economicActivity: 'Servicios de software',
      },
    });
  } catch (error) {
    console.error('Error obteniendo CAI del tenant:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
