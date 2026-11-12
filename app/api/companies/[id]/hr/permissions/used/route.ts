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
  const { searchParams } = new URL(request.url);  const employeeId = searchParams.get('employee_id');
  let query = getSupabaseServer()    .from('permission_used')    .select('*')    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));
  if (employeeId) query = query.eq('employee_id', employeeId);
  const { data, error } = await query.order('employee_id');  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  const body = await request.json();  const { data, error } = await getSupabaseServer()    .from('permission_used')    .upsert({
      tenant_id: empresa.tenantId, company_id: empresa.companyId,
      employee_id: body.employee_id,
      type_id: body.type_id,
      annual: body.annual ?? 0,
      monthly: body.monthly ?? 0,    }, { onConflict: 'tenant_id,employee_id,type_id' })    .select()    .single();  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  const body = await request.json();  const { id, ...updates } = body;  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });  const { error } = await getSupabaseServer()    .from('permission_used')    .update({
      annual: updates.annual,
      monthly: updates.monthly,    })    .eq('id', id)    .eq("tenant_id", empresa.tenantId)
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
  const { searchParams } = new URL(request.url);  const usedId = searchParams.get('id');  if (!usedId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });  const { error } = await getSupabaseServer()    .from('permission_used')    .delete()    .eq('id', usedId)    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });}
