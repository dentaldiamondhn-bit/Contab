import { NextRequest, NextResponse } from 'next/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // El `[id]` de esta ruta es `companies.id`, NO `Tenant.id`. Pasarlo a
  // `.eq("tenant_id", ...)` no da error: devuelve 0 filas, y estas pantallas
  // salian vacias sin avisar. `contextoDeEmpresa` valida la pertenencia (403
  // si la empresa no es de la sesion) y devuelve el tenant real.
  let empresa;
  try {
    empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    throw error;
  }
  const { data, error } = await getSupabaseServer()    .from('permission_types')    .select('*')    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa))    .order('label');  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);}
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // El `[id]` de esta ruta es `companies.id`, NO `Tenant.id`. Pasarlo a
  // `.eq("tenant_id", ...)` no da error: devuelve 0 filas, y estas pantallas
  // salian vacias sin avisar. `contextoDeEmpresa` valida la pertenencia (403
  // si la empresa no es de la sesion) y devuelve el tenant real.
  let empresa;
  try {
    empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    throw error;
  }
  const body = await request.json();  const { data, error } = await getSupabaseServer()    .from('permission_types')    .insert({
      tenant_id: empresa.tenantId, company_id: empresa.companyId,
      label: body.label,
      icon: body.icon || null,
      annual_days: body.annual_days ?? 0,
      monthly_accrual: body.monthly_accrual ?? 0,
      requires_approval: body.requires_approval ?? true,    })    .select()    .single();  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // El `[id]` de esta ruta es `companies.id`, NO `Tenant.id`. Pasarlo a
  // `.eq("tenant_id", ...)` no da error: devuelve 0 filas, y estas pantallas
  // salian vacias sin avisar. `contextoDeEmpresa` valida la pertenencia (403
  // si la empresa no es de la sesion) y devuelve el tenant real.
  let empresa;
  try {
    empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    throw error;
  }
  const body = await request.json();  const { id, ...updates } = body;  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });  const { error } = await getSupabaseServer()    .from('permission_types')    .update({
      label: updates.label,
      icon: updates.icon,
      annual_days: updates.annual_days,
      monthly_accrual: updates.monthly_accrual,
      requires_approval: updates.requires_approval,    })    .eq('id', id)    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // El `[id]` de esta ruta es `companies.id`, NO `Tenant.id`. Pasarlo a
  // `.eq("tenant_id", ...)` no da error: devuelve 0 filas, y estas pantallas
  // salian vacias sin avisar. `contextoDeEmpresa` valida la pertenencia (403
  // si la empresa no es de la sesion) y devuelve el tenant real.
  let empresa;
  try {
    empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    throw error;
  }
  const { searchParams } = new URL(request.url);  const typeId = searchParams.get('id');  if (!typeId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });  const { error } = await getSupabaseServer()    .from('permission_types')    .delete()    .eq('id', typeId)    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });}
