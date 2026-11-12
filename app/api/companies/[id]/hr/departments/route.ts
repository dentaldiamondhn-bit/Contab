import { NextRequest, NextResponse } from 'next/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { departmentCreateSchema, departmentUpdateSchema } from '@/lib/validations/hr';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // El `[id]` de esta ruta es `companies.id`, NO `Tenant.id`. Pasarlo a
  // `.eq("tenant_id", ...)` no da error, devuelve 0 filas: por eso estas
  // pantallas salian vacias. `contextoDeEmpresa` valida la pertenencia (403
  // si la empresa no es de la sesion) y devuelve el tenant real.
  let empresa;
  try {
    empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    throw error;
  }
  const { data, error } = await getSupabaseServer()
    .from('departments')
    .select('*')
    .eq("tenant_id", empresa.tenantId)
    .match(filtroEmpresaOCompany(empresa))
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // El `[id]` de esta ruta es `companies.id`, NO `Tenant.id`. Pasarlo a
  // `.eq("tenant_id", ...)` no da error, devuelve 0 filas: por eso estas
  // pantallas salian vacias. `contextoDeEmpresa` valida la pertenencia (403
  // si la empresa no es de la sesion) y devuelve el tenant real.
  let empresa;
  try {
    empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    throw error;
  }
  const body = await request.json();

  const parsed = departmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message, details: parsed.error.issues }, { status: 400 });
  }

  const { name, description, manager, parentId } = parsed.data;

  const { data: existing } = await getSupabaseServer()
    .from('departments')
    .select('id')
    .eq("tenant_id", empresa.tenantId)
    .match(filtroEmpresaOCompany(empresa))
    .ilike('name', name)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un departamento con ese nombre' }, { status: 409 });
  }

  const { data, error } = await getSupabaseServer()
    .from('departments')
    .insert({ tenant_id: empresa.tenantId,
      company_id: empresa.companyId, name: name.trim(), description: description || '', manager: manager || '', parent_id: parentId || null })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Ya existe un departamento con ese nombre' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // El `[id]` de esta ruta es `companies.id`, NO `Tenant.id`. Pasarlo a
  // `.eq("tenant_id", ...)` no da error, devuelve 0 filas: por eso estas
  // pantallas salian vacias. `contextoDeEmpresa` valida la pertenencia (403
  // si la empresa no es de la sesion) y devuelve el tenant real.
  let empresa;
  try {
    empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    throw error;
  }
  const body = await request.json();

  const parsed = departmentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message, details: parsed.error.issues }, { status: 400 });
  }

  const { id, name, description, manager, parentId } = parsed.data;

  if (name) {
    const { data: existing } = await getSupabaseServer()
      .from('departments')
      .select('id')
      .eq("tenant_id", empresa.tenantId)
    .match(filtroEmpresaOCompany(empresa))
      .ilike('name', name)
      .neq('id', id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un departamento con ese nombre' }, { status: 409 });
    }
  }

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description;
  if (manager !== undefined) updates.manager = manager;
  if (parentId !== undefined) updates.parent_id = parentId;

  const { error } = await getSupabaseServer()
    .from('departments')
    .update(updates)
    .eq('id', id)
    .eq("tenant_id", empresa.tenantId)
    .match(filtroEmpresaOCompany(empresa));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // El `[id]` de esta ruta es `companies.id`, NO `Tenant.id`. Pasarlo a
  // `.eq("tenant_id", ...)` no da error, devuelve 0 filas: por eso estas
  // pantallas salian vacias. `contextoDeEmpresa` valida la pertenencia (403
  // si la empresa no es de la sesion) y devuelve el tenant real.
  let empresa;
  try {
    empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    throw error;
  }
  const { searchParams } = new URL(request.url);
  const deptId = searchParams.get('id');
  if (!deptId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await getSupabaseServer()
    .from('departments')
    .delete()
    .eq('id', deptId)
    .eq("tenant_id", empresa.tenantId)
    .match(filtroEmpresaOCompany(empresa));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
