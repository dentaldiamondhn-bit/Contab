import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import {
  contextoDeEmpresa,
  respuestaDeErrorDeEmpresa,
} from '@/lib/tenant-resolver';

/**
 * CAI por empresa (pantalla /companies/[id]/security/cai y SARForm221).
 *
 * Antes usaba Prisma contra una tabla `cai_authorizations` que no existe y,
 * como `DATABASE_URL` no resuelve en este entorno, `$queryRaw` fallaba y la
 * ruta devolvia siempre `[]`. La tabla real es `cai`:
 *
 *   id, tenant_id, company_id, cai_number, start_number, end_number,
 *   current_number, issue_date, expiration_date, status, created_at, updated_at
 *
 * La respuesta mantiene los alias que ya consumen los componentes
 * (`codigo`, `rangoInicial`, `rangoFinal`, `fechaLimite`, `estado`) ademas de
 * los nombres reales (`cai_number`, `start_number`, ...).
 */

const COLUMNAS =
  'id, tenant_id, company_id, cai_number, start_number, end_number, current_number, issue_date, expiration_date, status, created_at, updated_at';

function numero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fechaCorta(value: unknown): string | null {
  if (!value) return null;
  const s = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

function formatear(row: any) {
  const rangeStart = numero(row.start_number);
  return {
    id: row.id,
    codigo: row.cai_number ?? '',
    cai: row.cai_number ?? '',
    cai_number: row.cai_number ?? '',
    tipoDocumento: 'Factura',
    rangoInicial: rangeStart,
    rangoFinal: numero(row.end_number),
    fechaLimite: fechaCorta(row.expiration_date),
    estado: row.status === 'active' ? 'activo' : 'inactivo',
    rangeStart,
    rangeEnd: numero(row.end_number),
    currentNumber: numero(row.current_number) || rangeStart,
    start_number: rangeStart,
    end_number: numero(row.end_number),
    current_number: numero(row.current_number) || rangeStart,
    issueDate: fechaCorta(row.issue_date),
    expiryDate: fechaCorta(row.expiration_date),
    isActive: row.status === 'active',
    companyId: row.company_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { tenantId, companyId: empresaId } = await contextoDeEmpresa(request, {
      companyIdDeRuta: companyId,
    });

    let query = getSupabaseServer()
      .from('cai')
      .select(COLUMNAS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // `company_id` separa empresas del mismo tenant; si la empresa no resolvio
    // se cae a tenant-only, igual que el resto de la app.
    if (empresaId) query = query.eq('company_id', empresaId);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching CAIs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch CAI data', data: [] },
        { status: 500 }
      );
    }

    return NextResponse.json((data || []).map(formatear));
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error in CAI API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CAI data', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { tenantId, companyId: empresaId } = await contextoDeEmpresa(request, {
      companyIdDeRuta: companyId,
    });
    const body = await request.json();

    const { codigo, rangoInicial, rangoFinal, fechaLimite } = body;
    const desde = numero(rangoInicial);
    const hasta = numero(rangoFinal);
    const vence = fechaCorta(fechaLimite);

    if (!codigo || !desde || !hasta || !vence) {
      return NextResponse.json(
        {
          error:
            'Faltan campos obligatorios: codigo, rangoInicial, rangoFinal, fechaLimite',
        },
        { status: 400 }
      );
    }

    if (desde >= hasta) {
      return NextResponse.json(
        { error: 'El rango inicial debe ser menor al rango final' },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabaseServer()
      .from('cai')
      .insert({
        tenant_id: tenantId,
        company_id: empresaId || null,
        cai_number: String(codigo).trim(),
        start_number: desde,
        end_number: hasta,
        current_number: desde,
        issue_date: new Date().toISOString().slice(0, 10),
        expiration_date: vence,
        status: 'active',
      })
      .select(COLUMNAS)
      .single();

    if (error) {
      console.error('Error creating CAI:', error);
      return NextResponse.json({ error: 'Failed to create CAI' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'CAI creado correctamente',
      data: formatear(data),
    });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error creating CAI:', error);
    return NextResponse.json({ error: 'Failed to create CAI' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { tenantId, companyId: empresaId } = await contextoDeEmpresa(request, {
      companyIdDeRuta: companyId,
    });
    const body = await request.json();
    const { id, codigo, rangoInicial, rangoFinal, fechaLimite, estado } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (codigo) update.cai_number = String(codigo).trim();
    if (rangoInicial !== undefined) update.start_number = numero(rangoInicial);
    if (rangoFinal !== undefined) update.end_number = numero(rangoFinal);
    if (fechaLimite) update.expiration_date = fechaCorta(fechaLimite);
    if (estado) update.status = estado === 'activo' || estado === 'active' ? 'active' : 'inactive';

    let query = getSupabaseServer()
      .from('cai')
      .update(update)
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (empresaId) query = query.eq('company_id', empresaId);

    const { data, error } = await query.select(COLUMNAS).maybeSingle();

    if (error) {
      console.error('Error updating CAI:', error);
      return NextResponse.json({ error: 'Failed to update CAI' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'CAI actualizado correctamente',
      data: data ? formatear(data) : null,
    });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error updating CAI:', error);
    return NextResponse.json({ error: 'Failed to update CAI' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { tenantId, companyId: empresaId } = await contextoDeEmpresa(request, {
      companyIdDeRuta: companyId,
    });
    const { searchParams } = new URL(request.url);
    const authorizationId = searchParams.get('id');

    if (!authorizationId) {
      return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });
    }

    let query = getSupabaseServer()
      .from('cai')
      .delete()
      .eq('id', authorizationId)
      .eq('tenant_id', tenantId);
    if (empresaId) query = query.eq('company_id', empresaId);

    const { error } = await query;

    if (error) {
      console.error('Error deleting CAI:', error);
      return NextResponse.json({ error: 'Failed to delete CAI' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'CAI eliminado correctamente' });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error deleting CAI:', error);
    return NextResponse.json({ error: 'Failed to delete CAI' }, { status: 500 });
  }
}
