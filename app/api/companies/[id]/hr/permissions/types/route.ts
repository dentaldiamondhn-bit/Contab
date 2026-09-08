import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { data, error } = await supabase
    .from('permission_types')
    .select('*')
    .eq('tenant_id', companyId)
    .order('label');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { data, error } = await supabase
    .from('permission_types')
    .insert({
      tenant_id: companyId,
      label: body.label,
      icon: body.icon || null,
      annual_days: body.annual_days ?? 0,
      monthly_accrual: body.monthly_accrual ?? 0,
      requires_approval: body.requires_approval ?? true,
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
    .from('permission_types')
    .update({
      label: updates.label,
      icon: updates.icon,
      annual_days: updates.annual_days,
      monthly_accrual: updates.monthly_accrual,
      requires_approval: updates.requires_approval,
    })
    .eq('id', id)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const typeId = searchParams.get('id');
  if (!typeId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await supabase
    .from('permission_types')
    .delete()
    .eq('id', typeId)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
