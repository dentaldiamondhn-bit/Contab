import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { data, error } = await supabase
    .from('attendance_schedules')
    .select('*')
    .eq('tenant_id', companyId)
    .order('employee_id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { data, error } = await supabase
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
  const { error } = await supabase
    .from('attendance_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
