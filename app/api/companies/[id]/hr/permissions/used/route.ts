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

  let query = supabase
    .from('permission_used')
    .select('*')
    .eq('tenant_id', companyId);

  if (employeeId) query = query.eq('employee_id', employeeId);

  const { data, error } = await query.order('employee_id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { data, error } = await supabase
    .from('permission_used')
    .upsert({
      tenant_id: companyId,
      employee_id: body.employee_id,
      type_id: body.type_id,
      annual: body.annual ?? 0,
      monthly: body.monthly ?? 0,
    }, { onConflict: 'tenant_id,employee_id,type_id' })
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
    .from('permission_used')
    .update({
      annual: updates.annual,
      monthly: updates.monthly,
    })
    .eq('id', id)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const usedId = searchParams.get('id');
  if (!usedId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await supabase
    .from('permission_used')
    .delete()
    .eq('id', usedId)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
