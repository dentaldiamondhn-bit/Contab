import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { data, error } = await getSupabaseServer()
    .from('work_schedules')
    .select('*')
    .eq('tenant_id', companyId)
    .order('name');
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { data, error } = await getSupabaseServer()
    .from('work_schedules')
    .insert({
      tenant_id: companyId,
      name: body.name,
      entry_time: body.entry_time || '08:00',
      exit_time: body.exit_time || '17:00',
      break_start: body.break_start || null,
      break_end: body.break_end || null,
      break2_start: body.break2_start || null,
      break2_end: body.break2_end || null,
      break3_start: body.break3_start || null,
      break3_end: body.break3_end || null,
      lunch_start: body.lunch_start || null,
      lunch_end: body.lunch_end || null,
      free_days: body.free_days || [0],
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await getSupabaseServer()
    .from('work_schedules')
    .update({
      name: updates.name,
      entry_time: updates.entry_time,
      exit_time: updates.exit_time,
      break_start: updates.break_start,
      break_end: updates.break_end,
      break2_start: updates.break2_start,
      break2_end: updates.break2_end,
      break3_start: updates.break3_start,
      break3_end: updates.break3_end,
      lunch_start: updates.lunch_start,
      lunch_end: updates.lunch_end,
      free_days: updates.free_days,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get('id');
  if (!scheduleId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await getSupabaseServer()
    .from('work_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
