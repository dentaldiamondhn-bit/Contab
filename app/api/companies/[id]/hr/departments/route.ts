import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { data, error } = await getSupabaseServer()
    .from('departments')
    .select('*')
    .eq('tenant_id', companyId)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'El nombre del departamento es requerido' }, { status: 400 });
  }
  const { data, error } = await getSupabaseServer()
    .from('departments')
    .insert({ tenant_id: companyId, name: body.name.trim(), description: body.description || '', manager: body.manager || '', parent_id: body.parentId || null })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Ya existe un departamento con ese nombre' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await getSupabaseServer()
    .from('departments')
    .update({ name: updates.name, description: updates.description, manager: updates.manager, parent_id: updates.parentId || null })
    .eq('id', id)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const deptId = searchParams.get('id');
  if (!deptId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await getSupabaseServer()
    .from('departments')
    .delete()
    .eq('id', deptId)
    .eq('tenant_id', companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
