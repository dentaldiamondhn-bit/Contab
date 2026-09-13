import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { positionCreateSchema, positionUpdateSchema } from '@/lib/validations/hr';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { data, error } = await getSupabaseServer()
    .from('positions')
    .select('*')
    .eq('tenant_id', companyId)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();

  const parsed = positionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message, details: parsed.error.issues }, { status: 400 });
  }

  const { name, department, description, minSalary, maxSalary, parentId } = parsed.data;

  const { data: existing } = await getSupabaseServer()
    .from('positions')
    .select('id')
    .eq('tenant_id', companyId)
    .ilike('name', name)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un cargo con ese nombre' }, { status: 409 });
  }

  const { data, error } = await getSupabaseServer()
    .from('positions')
    .insert({ tenant_id: companyId, name: name.trim(), department: department || '', description: description || '', min_salary: minSalary || 0, max_salary: maxSalary || 0, parent_id: parentId || null })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Ya existe un cargo con ese nombre' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();

  const parsed = positionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message, details: parsed.error.issues }, { status: 400 });
  }

  const { id, name, department, description, minSalary, maxSalary, parentId } = parsed.data;

  if (name) {
    const { data: existing } = await getSupabaseServer()
      .from('positions')
      .select('id')
      .eq('tenant_id', companyId)
      .ilike('name', name)
      .neq('id', id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un cargo con ese nombre' }, { status: 409 });
    }
  }

  if (minSalary !== undefined && maxSalary !== undefined && maxSalary > 0 && minSalary > 0 && maxSalary < minSalary) {
    return NextResponse.json({ error: 'El salario máximo no puede ser menor al salario mínimo' }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name.trim();
  if (department !== undefined) updates.department = department;
  if (description !== undefined) updates.description = description;
  if (minSalary !== undefined) updates.min_salary = minSalary;
  if (maxSalary !== undefined) updates.max_salary = maxSalary;
  if (parentId !== undefined) updates.parent_id = parentId;

  const { error } = await getSupabaseServer()
    .from('positions')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const posId = searchParams.get('id');
  if (!posId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await getSupabaseServer()
    .from('positions')
    .delete()
    .eq('id', posId)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
