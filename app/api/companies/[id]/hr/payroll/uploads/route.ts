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
  const { searchParams } = new URL(request.url);  const month = searchParams.get('month');  const year = searchParams.get('year');
  let query = getSupabaseServer()    .from('payroll_uploads')    .select('*')    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));
  if (month) query = query.eq('closing_month', parseInt(month));  if (year) query = query.eq('closing_year', parseInt(year));
  const { data, error } = await query;  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  const body = await request.json();  const { employee_id, closing_month, closing_year, items } = body;
  if (!employee_id || !closing_month || !closing_year || !items) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });  }
  const { data, error } = await getSupabaseServer()    .from('payroll_uploads')    .upsert(
      {
        tenant_id: empresa.tenantId, company_id: empresa.companyId,
        employee_id,
        closing_month,
        closing_year,
        items: JSON.stringify(items),
        updated_at: new Date().toISOString(),      },
      { onConflict: 'tenant_id,employee_id,closing_month,closing_year' }
    )    .select()    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);}
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
  const { searchParams } = new URL(request.url);  const month = searchParams.get('month');  const year = searchParams.get('year');  const employeeId = searchParams.get('employee_id');
  let query = getSupabaseServer()    .from('payroll_uploads')    .delete()    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));
  if (employeeId) {
    query = query.eq('employee_id', employeeId);  }  if (month) query = query.eq('closing_month', parseInt(month));  if (year) query = query.eq('closing_year', parseInt(year));
  const { error } = await query;  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });}
