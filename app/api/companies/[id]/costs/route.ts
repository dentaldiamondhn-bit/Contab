import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseService } from '@/lib/supabase-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  try {
    // Costos reales desde la tabla cost_payments del tenant
    const { data, error } = await supabaseService
      .from('cost_payments')
      .select('cost_type, cost_key, amount')
      .eq('tenant_id', companyId);

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

    if (!fixed || !variable || !periodMonth || !periodYear) {
      return NextResponse.json(
        { error: 'Missing required fields: fixed, variable, periodMonth, periodYear' },
        { status: 400 }
      );
    }

    const rows: { cost_type: string; cost_key: string; amount: number; tenant_id: string; due_date: string | null }[] = [];

    Object.entries(fixed).forEach(([key, value]) => {
      rows.push({
        tenant_id: companyId,
        cost_type: 'fixed',
        cost_key: key,
        amount: Number(value) || 0,
        due_date: `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`,
      });
    });
    Object.entries(variable).forEach(([key, value]) => {
      rows.push({
        tenant_id: companyId,
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