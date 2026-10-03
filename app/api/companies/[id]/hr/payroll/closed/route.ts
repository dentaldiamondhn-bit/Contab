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
  const { data, error } = await getSupabaseServer()    .from('payroll_closed')    .select('*')    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa))    .order('closed_at', { ascending: false });  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  const body = await request.json();
  if (!body.period || !body.month || !body.year || !body.frequency) {
    return NextResponse.json({ error: 'Faltan campos requeridos: period, month, year, frequency' }, { status: 400 });  }
  const { data: existing } = await getSupabaseServer()    .from('payroll_closed')    .select('id')    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa))    .eq('month', body.month)    .eq('year', body.year)    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: `Ya existe una planilla cerrada para ${body.month}/${body.year}` }, { status: 409 });  }
  const { data, error } = await getSupabaseServer()    .from('payroll_closed')    .insert({
      tenant_id: empresa.tenantId, company_id: empresa.companyId,
      period: body.period,
      month: body.month,
      year: body.year,
      frequency: body.frequency,
      total_period_base: body.total_period_base,
      total_base: body.total_base,
      total_deductions: body.total_deductions,
      total_igss_employer: body.total_igss_employer,
      total_net_pay: body.total_net_pay,
      total_attendance_deductions: body.total_attendance_deductions,
      total_attendance_incomes: body.total_attendance_incomes,
      employee_count: body.employee_count,
      employees: body.employees,
      closed_by: body.closed_by,    })    .select()    .single();  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  const { searchParams } = new URL(request.url);  const closedId = searchParams.get('id');  if (!closedId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });  const { error } = await getSupabaseServer()    .from('payroll_closed')    .delete()    .eq('id', closedId)    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });}
