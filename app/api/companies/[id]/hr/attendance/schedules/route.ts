import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { data, error } = await getSupabaseServer()
    .from('attendance_schedules')
    .select('*')
    .eq('tenant_id', companyId)
    .order('employee_id');
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { data, error } = await getSupabaseServer()
    .from('attendance_schedules')
    .upsert(
      { tenant_id: companyId, employee_id: body.employee_id, free_days: body.free_days },
      { onConflict: 'tenant_id,employee_id' }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get('id');
  if (!scheduleId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await getSupabaseServer()
    .from('attendance_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const records = body.records as Array<{ employee_id: string; free_days: number[] }>;
  if (!records || !Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: 'Missing records array' }, { status: 400 });
  }
  const rows = records.map(r => ({ tenant_id: companyId, employee_id: r.employee_id, free_days: r.free_days }));
  const { data, error } = await getSupabaseServer()
    .from('attendance_schedules')
    .upsert(rows, { onConflict: 'tenant_id,employee_id' })
    .select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: data?.length || 0 });
}
