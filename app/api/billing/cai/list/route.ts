import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

/**
 * /api/billing/cai/list
 *
 * Antes usaba Prisma (`db.cAI`). Esa consulta daba 500: el schema de Prisma
 * declara `model CAI` varias veces y con columnas que la tabla real no tiene
 * (`cai`, `rango_inicial`, `fecha_limite_emision`...). La tabla `cai` real
 * (verificada contra Supabase) tiene:
 *
 *   id, tenant_id, company_id, cai_number, start_number, end_number,
 *   current_number, issue_date, expiration_date, status, created_at, updated_at
 *
 * Se lee/escribe con el cliente Supabase, igual que el resto de rutas de
 * facturación, y el tenant sale del header de sesion (`x-tenant-id`).
 */

const COLUMNAS =
  'id, tenant_id, company_id, cai_number, start_number, end_number, current_number, issue_date, expiration_date, status, created_at, updated_at';

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

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = await tenantDeSesion(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Usuario no asociado a un tenant' }, { status: 404 });
    }

    const { data, error } = await (getSupabaseServer() as any)
      .from('cai')
      .select(COLUMNAS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo CAIs:', error);
      return NextResponse.json(
        { error: 'Error obteniendo CAIs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: (data || []).map(formatear),
    });
  } catch (error) {
    console.error('Error obteniendo CAIs:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = await tenantDeSesion(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Usuario no asociado a un tenant' }, { status: 404 });
    }

    const body = await request.json();
    const {
      cai,
      rangeStart,
      rangeEnd,
      currentNumber,
      expiryDate,
      start_number,
      end_number,
      current_number,
      expiration_date,
      isActive = true,
    } = body;

    const codigo = String(cai ?? '').trim();
    const desde = numero(rangeStart ?? start_number);
    const hasta = numero(rangeEnd ?? end_number);
    const actual = numero(currentNumber ?? current_number) || desde;
    const vence = String(expiryDate ?? expiration_date ?? '').trim();

    if (!codigo || !desde || !hasta || !vence) {
      return NextResponse.json(
        { error: 'CAI, rangos y fecha de vencimiento son obligatorios' },
        { status: 400 }
      );
    }

    if (desde >= hasta) {
      return NextResponse.json(
        { error: 'El rango inicial debe ser menor al rango final' },
        { status: 400 }
      );
    }

    if (codigo.length < 32 || codigo.length > 37) {
      return NextResponse.json(
        { error: `El CAI debe tener entre 32 y 37 caracteres (tiene ${codigo.length})` },
        { status: 400 }
      );
    }

    if (actual < desde || actual > hasta) {
      return NextResponse.json(
        { error: 'El número actual debe estar dentro del rango especificado' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer() as any;

    const { data: existing } = await supabase
      .from('cai')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('cai_number', codigo)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json(
        { error: 'Este CAI ya existe para el tenant actual' },
        { status: 400 }
      );
    }

    const hoy = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('cai')
      .insert({
        tenant_id: tenantId,
        cai_number: codigo,
        start_number: desde,
        end_number: hasta,
        current_number: actual,
        issue_date: hoy,
        expiration_date: vence,
        status: isActive === false ? 'inactive' : 'active',
      })
      .select(COLUMNAS)
      .single();

    if (error) {
      console.error('Error creando CAI:', error);
      return NextResponse.json(
        { error: 'Error creando CAI', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formatear(data),
      message: 'CAI creado correctamente',
    });
  } catch (error) {
    console.error('Error creando CAI:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
