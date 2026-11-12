import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseService } from '@/lib/supabase-db';
import { tenantFromCompanyId } from '@/lib/tenant-resolver';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  try {
    // El `[id]` de la ruta es el companies.id; las tablas guardan el tenant_id.
    const tenantId = await tenantFromCompanyId(companyId);

    // Costos reales desde la tabla cost_payments del tenant
    // OJO: en supabase-js `.eq()` devuelve una consulta nueva, hay que reasignar
    // el resultado. Antes se descartaba, asi que salia sin filtro y devolvia los
    // costos de TODAS las empresas. Ademas `?companyId` (del cliente) no puede
    // sustituir al `[id]` de la ruta.
    let costQuery = supabaseService
      .from('cost_payments')
      .select('cost_type, cost_key, amount');
    if (tenantId) {
      costQuery = costQuery.eq('tenant_id', tenantId);
    }
    const { data, error } = await costQuery;

    if (error) {
      console.error('Error fetching costs:', error);
      return NextResponse.json({ fixed: {}, variable: {} });
    }

    const fixed: Record<string, number> = {};
    const variable: Record<string, number> = {};

    (data || []).forEach((row: any) => {
      const amount = Number(row.amount || 0);
      if (row.cost_type === 'fixed') {
        fixed[row.cost_key] = (fixed[row.cost_key] || 0) + amount;
      } else if (row.cost_type === 'variable') {
        variable[row.cost_key] = (variable[row.cost_key] || 0) + amount;
      }
    });

    return NextResponse.json({ fixed, variable });
  } catch (error) {
    console.error('Error fetching costs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch costs' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  try {
    const body = await request.json();
    const { fixed, variable, periodMonth, periodYear } = body;
    // Los costos se guardan con el tenant_id, no con el companies.id de la ruta.
    const tenantId = await tenantFromCompanyId(companyId);

    if (!fixed || !variable || !periodMonth || !periodYear) {
      return NextResponse.json(
        { error: 'Missing required fields: fixed, variable, periodMonth, periodYear' },
        { status: 400 }
      );
    }

    const rows: { cost_type: string; cost_key: string; amount: number; tenant_id: string; due_date: string | null }[] = [];

    Object.entries(fixed).forEach(([key, value]) => {
      rows.push({
        tenant_id: tenantId || companyId,
        cost_type: 'fixed',
        cost_key: key,
        amount: Number(value) || 0,
        due_date: `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`,
      });
    });
    Object.entries(variable).forEach(([key, value]) => {
      rows.push({
        tenant_id: tenantId || companyId,
        cost_type: 'variable',
        cost_key: key,
        amount: Number(value) || 0,
        due_date: `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`,
      });
    });

    if (rows.length > 0) {
      const { error: insertError } = await supabaseService
        .from('cost_payments')
        .upsert(rows, { onConflict: 'tenant_id,cost_type,cost_key' });

      if (insertError) {
        console.error('Error saving costs:', insertError);
        return NextResponse.json(
          { error: 'Error guardando costos en la base de datos' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Costos actualizados en la base de datos'
    });
  } catch (error) {
    console.error('Error updating costs:', error);
    return NextResponse.json(
      { error: 'Failed to update costs' },
      { status: 500 }
    );
  }
}