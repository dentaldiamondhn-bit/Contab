import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

/**
 * /api/billing/cai/[id]
 *
 * Antes usaba Prisma (`db.cAI`) y `params.id` sincronico. En Next 16 `params`
 * es una Promise y el cliente Prisma estaba desalineado con la tabla real de
 * Supabase, asi que editar/borrar un CAI daba 500. Se usa el mismo esquema que
 * /api/billing/cai/list (cai_number, start_number, end_number, ...).
 */

const COLUMNAS =
  'id, tenant_id, cai_number, start_number, end_number, current_number, issue_date, expiration_date, status, created_at, updated_at';

function fecha(value: unknown): string {
  if (!value) return '';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function numero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatear(row: any) {
  const rangeStart = numero(row.start_number);
  return {
    id: row.id,
    cai: row.cai_number ?? '',
    rangeStart,
    rangeEnd: numero(row.end_number),
    currentNumber: numero(row.current_number) || rangeStart,
    expiryDate: fecha(row.expiration_date),
    isActive: row.status === 'active',
    establishmentCode: '',
    pointOfSaleCode: '',
    economicActivity: '',
    issueDate: fecha(row.issue_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function tenantDeSesion(request: NextRequest): Promise<string | null> {
  const deHeader = request.headers.get('x-tenant-id');
  if (deHeader) return deHeader;

  const { sessionClaims } = await auth();
  const metadata = (sessionClaims?.metadata ?? {}) as Record<string, unknown>;
  const deClaims =
    ((sessionClaims as any)?.tenantId as string | undefined) ||
    (metadata.tenantId as string | undefined);
  if (deClaims) return deClaims;

  const user = await currentUser();
  return (
    (user?.publicMetadata?.tenantId as string | undefined) ||
    (user?.privateMetadata?.tenantId as string | undefined) ||
    null
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = await tenantDeSesion(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseServer() as any;

    const { data: existing } = await supabase
      .from('cai')
      .select('id, cai_number, issue_date, start_number, end_number, current_number, expiration_date, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!existing?.id) {
      return NextResponse.json(
        { error: 'CAI no encontrado o no pertenece a este tenant' },
        { status: 404 }
      );
    }

    const codigo =
      body.cai !== undefined ? String(body.cai).trim() : String(existing.cai_number ?? '');
    const desde =
      body.rangeStart !== undefined || body.start_number !== undefined
        ? numero(body.rangeStart ?? body.start_number)
        : numero(existing.start_number);
    const hasta =
      body.rangeEnd !== undefined || body.end_number !== undefined
        ? numero(body.rangeEnd ?? body.end_number)
        : numero(existing.end_number);
    const actual =
      body.currentNumber !== undefined || body.current_number !== undefined
        ? numero(body.currentNumber ?? body.current_number)
        : numero(existing.current_number) || desde;
    const vence =
      body.expiryDate !== undefined || body.expiration_date !== undefined
        ? String(body.expiryDate ?? body.expiration_date).trim()
        : String(existing.expiration_date ?? '');
    const activo =
      body.isActive !== undefined || body.status !== undefined
        ? body.isActive !== undefined
          ? body.isActive !== false
          : String(body.status).toLowerCase() === 'active'
        : existing.status === 'active';

    if (!codigo || codigo.length < 32 || codigo.length > 37) {
      return NextResponse.json(
        { error: 'El CAI debe tener entre 32 y 37 caracteres' },
        { status: 400 }
      );
    }
    if (!desde || !hasta || desde >= hasta) {
      return NextResponse.json(
        { error: 'El rango inicial debe ser menor al rango final' },
        { status: 400 }
      );
    }
    if (!vence) {
      return NextResponse.json(
        { error: 'La fecha de vencimiento es obligatoria' },
        { status: 400 }
      );
    }
    if (actual < desde || actual > hasta) {
      return NextResponse.json(
        { error: 'El número actual debe estar dentro del rango especificado' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('cai')
      .update({
        cai_number: codigo,
        start_number: desde,
        end_number: hasta,
        current_number: actual,
        expiration_date: vence,
        status: activo ? 'active' : 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(COLUMNAS)
      .single();

    if (error) {
      console.error('Error actualizando CAI:', error);
      return NextResponse.json(
        { error: 'Error actualizando CAI', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formatear(data),
      message: 'CAI actualizado correctamente',
    });
  } catch (error) {
    console.error('Error actualizando CAI:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = await tenantDeSesion(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getSupabaseServer() as any;

    const { data: existing } = await supabase
      .from('cai')
      .select('id, cai_number')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!existing?.id) {
      return NextResponse.json(
        { error: 'CAI no encontrado o no pertenece a este tenant' },
        { status: 404 }
      );
    }

    const { count } = await supabase
      .from('Invoice')
      .select('id', { count: 'exact', head: true })
      .eq('cai', existing.cai_number)
      .eq('tenantId', tenantId);

    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un CAI que tiene facturas asociadas' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('cai').delete().eq('id', id).eq('tenant_id', tenantId);

    if (error) {
      console.error('Error eliminando CAI:', error);
      return NextResponse.json(
        { error: 'Error eliminando CAI', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'CAI eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando CAI:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
