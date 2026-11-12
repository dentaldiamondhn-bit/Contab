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

// PUT /api/companies/[id]/billing/config/cai/[caiId]
// Body: { cai?, rangeStart?, rangeEnd?, currentNumber?, expiryDate?, isActive? }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; caiId: string }> },
) {
  try {
    const { id: companyId, caiId } = await params;
    if (!companyId || !caiId) {
      return NextResponse.json({ success: false, error: 'Parámetros incompletos' }, { status: 400 });
    }
    const body = await request.json();
    const supabase = getSupabaseServer();
    const tenantId = await resolveTenant(companyId, tenantHint(request));

    const { data: existing } = await supabase
      .from('cai')
      .select('id, cai, cai_number, issue_date, start_number, end_number, current_number, expiration_date, status')
      .eq('id', caiId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!existing?.id) {
      return NextResponse.json(
        { success: false, error: 'CAI no encontrado o no pertenece a este tenant' },
        { status: 404 },
      );
    }

    const cai = body.cai !== undefined ? String(body.cai).trim() : existing.cai;
    const rangeStart = body.rangeStart !== undefined ? num(body.rangeStart) : num(existing.start_number);
    const rangeEnd = body.rangeEnd !== undefined ? num(body.rangeEnd) : num(existing.end_number);
    const currentNumber =
      body.currentNumber !== undefined ? num(body.currentNumber) : num(existing.current_number);
    const expiryDate =
      body.expiryDate !== undefined && String(body.expiryDate).trim()
        ? String(body.expiryDate).trim()
        : existing.expiration_date;
    const isActive = body.isActive !== undefined ? body.isActive !== false : existing.status === 'active';

    if (!cai || String(cai).length < 32 || String(cai).length > 37) {
      return NextResponse.json(
        { success: false, error: 'El CAI debe tener entre 32 y 37 caracteres' },
        { status: 400 },
      );
    }
    if (rangeStart >= rangeEnd) {
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

    const now = new Date().toISOString();
    // Se actualizan los dos esquemas de la tabla `cai` (ver notas en el POST).
    const { data, error } = await supabase
      .from('cai')
      .update({
        cai: String(cai),
        cai_number: String(cai),
        start_number: rangeStart,
        end_number: rangeEnd,
        current_number: currentNumber,
        rango_inicial: rangeStart,
        rango_final: rangeEnd,
        current_correlative: currentNumber,
        cantidad_recibos: rangeEnd - rangeStart + 1,
        recibos_utilizados: currentNumber - rangeStart,
        recibos_disponibles: rangeEnd - currentNumber + 1,
        issue_date: (existing as any).issue_date || now.slice(0, 10),
        expiration_date: expiryDate,
        fecha_limite_emision: expiryDate,
        status: isActive ? 'active' : 'inactive',
        estado: isActive ? 'activo' : 'inactivo',
        updated_at: now,
      })
      .eq('id', caiId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const row = data as any;
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        cai: row.cai || row.cai_number,
        rangeStart: num(row.start_number) || num(row.rango_inicial),
        rangeEnd: num(row.end_number) || num(row.rango_final),
        currentNumber: num(row.current_number) || num(row.current_correlative),
        issueDate: row.issue_date || null,
        expiryDate: row.expiration_date || row.fecha_limite_emision || null,
        isActive: row.status === 'active' || row.estado === 'activo',
      },
      message: 'CAI actualizado correctamente',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/companies/[id]/billing/config/cai/[caiId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; caiId: string }> },
) {
  try {
    const { id: companyId, caiId } = await params;
    if (!companyId || !caiId) {
      return NextResponse.json({ success: false, error: 'Parámetros incompletos' }, { status: 400 });
    }
    const supabase = getSupabaseServer();
    const tenantId = await resolveTenant(companyId, tenantHint(request));

    const { data: existing } = await supabase
      .from('cai')
      .select('id, cai, cai_number')
      .eq('id', caiId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!existing?.id) {
      return NextResponse.json(
        { success: false, error: 'CAI no encontrado o no pertenece a este tenant' },
        { status: 404 },
      );
    }

    // El codigo puede vivir en `cai` (legacy) o en `cai_number` (esquema espanol).
    const existingRow = existing as any;
    const codes = [existingRow.cai, existingRow.cai_number]
      .map((value) => (value ? String(value).trim() : ''))
      .filter(Boolean);
    const uniqueCodes = [...new Set(codes)];

    let usedCount = 0;
    for (const code of uniqueCodes) {
      const { count } = await supabase
        .from('Invoice')
        .select('id', { count: 'exact', head: true })
        .eq('cai', code)
        .eq('tenantId', tenantId);
      usedCount += count || 0;
    }
    if (usedCount > 0) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar un CAI que tiene facturas asociadas' },
        { status: 400 },
      );
    }

    const { error } = await supabase.from('cai').delete().eq('id', caiId).eq('tenant_id', tenantId);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'CAI eliminado correctamente' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}