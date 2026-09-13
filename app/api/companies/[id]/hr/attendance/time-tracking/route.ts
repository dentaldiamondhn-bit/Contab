import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

type EventType = 'entrance' | 'break_start' | 'break_end' | 'lunch_start' | 'lunch_end' | 'end_of_shift' | 'overtime_start' | 'overtime_end';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const employeeId = searchParams.get('employee_id');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  let query = getSupabaseServer()
    .from('time_tracking')
    .select('*')
    .eq('tenant_id', companyId);

  if (date) {
    query = query.eq('date', date);
  } else if (start && end) {
    query = query.gte('date', start).lte('date', end);
  }

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  const { data, error } = await query.order('event_time', { ascending: true });
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { employee_id, date, event_type, event_time, notes } = body as {
    employee_id: string;
    date: string;
    event_type: EventType;
    event_time?: string;
    notes?: string;
  };

  if (!employee_id || !date || !event_type) {
    return NextResponse.json({ error: 'Missing employee_id, date, or event_type' }, { status: 400 });
  }

  const validTypes: EventType[] = ['entrance', 'break_start', 'break_end', 'lunch_start', 'lunch_end', 'end_of_shift', 'overtime_start', 'overtime_end'];
  if (!validTypes.includes(event_type)) {
    return NextResponse.json({ error: `Invalid event_type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
  }

  const { data, error } = await getSupabaseServer()
    .from('time_tracking')
    .upsert(
      {
        tenant_id: companyId,
        employee_id,
        date,
        event_type,
        event_time: event_time || new Date().toISOString(),
        notes: notes || null,
      },
      { onConflict: 'tenant_id,employee_id,date,event_type' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const recordId = searchParams.get('id');
  const employeeId = searchParams.get('employee_id');
  const date = searchParams.get('date');
  const eventType = searchParams.get('event_type');

  if (recordId) {
    const { error } = await getSupabaseServer()
      .from('time_tracking')
      .delete()
      .eq('id', recordId)
      .eq('tenant_id', companyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (employeeId && date && eventType) {
    const { error } = await getSupabaseServer()
      .from('time_tracking')
      .delete()
      .eq('tenant_id', companyId)
      .eq('employee_id', employeeId)
      .eq('date', date)
      .eq('event_type', eventType);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Missing id or employee_id+date+event_type' }, { status: 400 });
}
