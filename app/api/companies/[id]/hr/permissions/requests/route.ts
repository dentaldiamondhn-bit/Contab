import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employee_id');
  const status = searchParams.get('status');

  let query = supabase
    .from('permission_requests')
    .select('*')
    .eq('tenant_id', companyId);

  if (employeeId) query = query.eq('employee_id', employeeId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { data, error } = await supabase
    .from('permission_requests')
    .insert({
      tenant_id: companyId,
      employee_id: body.employee_id,
      type_id: body.type_id,
      type_label: body.type_label,
      start_date: body.start_date,
      end_date: body.end_date,
      days: body.days,
      reason: body.reason || '',
      status: body.status || 'pending',
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
  const { error } = await supabase
    .from('permission_requests')
    .update({
      status: updates.status,
      resolved_by: updates.resolved_by,
      resolved_at: updates.resolved_at,
    })
    .eq('id', id)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('id');
  if (!requestId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await supabase
    .from('permission_requests')
    .delete()
    .eq('id', requestId)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
