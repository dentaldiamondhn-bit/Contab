import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { resolveTenant } from '@/lib/services/budget-service';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

function num(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

// GET /api/companies/[id]/billing/config/cai?tenantId=
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: companyId } = await params;
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId es requerido' }, { status: 400 });
    }
    const supabase = getSupabaseServer();
    const tenantId = await resolveTenant(companyId, tenantHint(request));

    // La tabla `cai` tiene dos esquemas superpuestos: el legacy en ingles
    // (cai, start_number, ... tenant_id) que usa la emision de facturas, y el
    // esquema en espanol (cai_number, rango_inicial, ... company_id) con NOT NULL.
    // Se leen ambos y se prioriza el que tenga valor.
    const { data, error } = await supabase
      .from('cai')
      .select(
        'id, cai, cai_number, start_number, end_number, current_number, issue_date, expiration_date, status, rango_inicial, rango_final, current_correlative, fecha_asignacion, fecha_limite_emision, estado',
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const firstNonEmpty = (...values: unknown[]): string => {
      for (const value of values) {
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          return String(value).trim();
        }
      }
      return '';
    };

    const cais = ((data || []) as Array<{
      id: string;
      cai: string | null;
      cai_number: string | null;
      start_number: number | string | null;
      end_number: number | string | null;
      current_number: number | string | null;
      issue_date: string | null;
      expiration_date: string | null;
      status: string | null;
      rango_inicial: number | string | null;
      rango_final: number | string | null;
      current_correlative: number | string | null;
      fecha_asignacion: string | null;
      fecha_limite_emision: string | null;
      estado: string | null;
    }>).map((c) => {
      const rangeStart = num(c.start_number) || num(c.rango_inicial);
      const rangeEnd = num(c.end_number) || num(c.rango_final);
      const currentNumber = num(c.current_number) || num(c.current_correlative) || rangeStart;
      const statusValue = firstNonEmpty(c.status, c.estado);
      return {
        id: c.id,
        cai: firstNonEmpty(c.cai, c.cai_number),
        rangeStart,
        rangeEnd,
        currentNumber,
        issueDate: firstNonEmpty(c.issue_date, c.fecha_asignacion) || null,
        expiryDate: firstNonEmpty(c.expiration_date, c.fecha_limite_emision) || null,
        isActive: statusValue ? statusValue === 'active' || statusValue === 'activo' : false,
      };
    });

    return NextResponse.json({ success: true, data: cais });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/companies/[id]/billing/config/cai
// Body: { cai, rangeStart, rangeEnd, currentNumber?, expiryDate, isActive? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: companyId } = await params;
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId es requerido' }, { status: 400 });
    }
    const body = await request.json();
    const supabase = getSupabaseServer();
    const tenantId = await resolveTenant(companyId, tenantHint(request));

    const cai = String(body.cai || '').trim();
    const rangeStart = num(body.rangeStart);
    const rangeEnd = num(body.rangeEnd);
    // Si no se envia correlativo actual (0, null o vacio), se usa el inicio del rango.
    const currentNumber = num(body.currentNumber) || rangeStart;
    const expiryDate = String(body.expiryDate || '').trim();
    const isActive = body.isActive !== false;

    if (!cai) {
      return NextResponse.json({ success: false, error: 'El código CAI es obligatorio' }, { status: 400 });
    }
    if (cai.length < 32 || cai.length > 37) {
      return NextResponse.json(
        { success: false, error: `El CAI debe tener entre 32 y 37 caracteres (tiene ${cai.length})` },
        { status: 400 },
      );
    }
    if (!rangeStart || !rangeEnd || rangeStart >= rangeEnd) {
      return NextResponse.json(
        { success: false, error: 'El rango inicial debe ser menor al rango final' },
        { status: 400 },
      );
    }
    if (!expiryDate) {
      return NextResponse.json(
        { success: false, error: 'La fecha de vencimiento es obligatoria' },
        { status: 400 },
      );
    }
    if (currentNumber < rangeStart || currentNumber > rangeEnd) {
      return NextResponse.json(
        { success: false, error: 'El número actual debe estar dentro del rango' },
        { status: 400 },
      );
    }

    const { data: existing } = await supabase
      .from('cai')
      .select('id')
      .eq('tenant_id', tenantId)
      .or(`cai.eq.${cai},cai_number.eq.${cai}`)
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      return NextResponse.json(
        { success: false, error: 'Este CAI ya existe para el tenant actual' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const activeWord = isActive ? 'active' : 'inactive';
    const estadoWord = isActive ? 'activo' : 'inactivo';
    const totalRecibos = rangeEnd - rangeStart + 1;

    // Se escriben los dos esquemas de la tabla `cai`:
    // - espanol: cai_number/company_id/rango_*/... (varias columnas son NOT NULL)
    // - legacy ingles: cai/tenant_id/current_number/... (lo usa la emision de facturas)
    const { data, error } = await supabase
      .from('cai')
      .insert({
        cai_number: cai,
        company_id: tenantId,
        fecha_asignacion: today,
        fecha_limite_emision: expiryDate,
        rango_inicial: rangeStart,
        rango_final: rangeEnd,
        cantidad_recibos: totalRecibos,
        recibos_utilizados: currentNumber - rangeStart,
        recibos_disponibles: rangeEnd - currentNumber + 1,
        estado: estadoWord,
        current_correlative: currentNumber,
        cai,
        start_number: rangeStart,
        end_number: rangeEnd,
        current_number: currentNumber,
        issue_date: today,
        expiration_date: expiryDate,
        status: activeWord,
        tenant_id: tenantId,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        cai: data.cai,
        rangeStart: num(data.start_number),
        rangeEnd: num(data.end_number),
        currentNumber: num(data.current_number),
        issueDate: data.issue_date || null,
        expiryDate: data.expiration_date || null,
        isActive: (data as any).status === 'active',
      },
      message: 'CAI creado correctamente',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}