import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  let query = getSupabaseServer()
    .from('payroll_uploads')
    .select('*')
    .eq('tenant_id', companyId);

  if (month) query = query.eq('closing_month', parseInt(month));
  if (year) query = query.eq('closing_year', parseInt(year));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { employee_id, closing_month, closing_year, items } = body;

  if (!employee_id || !closing_month || !closing_year || !items) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await getSupabaseServer()
    .from('payroll_uploads')
    .upsert(
      {
        tenant_id: companyId,
        employee_id,
        closing_month,
        closing_year,
        items: JSON.stringify(items),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,employee_id,closing_month,closing_year' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const employeeId = searchParams.get('employee_id');

  let query = getSupabaseServer()
    .from('payroll_uploads')
    .delete()
    .eq('tenant_id', companyId);

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }
  if (month) query = query.eq('closing_month', parseInt(month));
  if (year) query = query.eq('closing_year', parseInt(year));

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
