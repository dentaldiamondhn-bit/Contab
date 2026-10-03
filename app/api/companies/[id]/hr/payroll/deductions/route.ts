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
  const { searchParams } = new URL(request.url);  const employeeId = searchParams.get('employee_id');  let query = getSupabaseServer()    .from('payroll_deductions')    .select('*')    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));  if (employeeId) {
    query = query.eq('employee_id', employeeId);  }  const { data, error } = await query.order('employee_id');  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  const body = await request.json();  const { data, error } = await getSupabaseServer()    .from('payroll_deductions')    .upsert(
      {
        tenant_id: empresa.tenantId, company_id: empresa.companyId,
        employee_id: body.employee_id,
        deduction_id: body.deduction_id,
        name: body.name,
        type: body.type,
        value: body.value,
        enabled: body.enabled,
        is_standard: body.is_standard,
        payment_frequency: body.payment_frequency,
        total_payments: body.total_payments,
        quincena: body.quincena,      },
      { onConflict: 'tenant_id,employee_id,deduction_id' }
    )    .select()    .single();  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  const { searchParams } = new URL(request.url);  const deductionRecordId = searchParams.get('id');  const employeeId = searchParams.get('employee_id');  const deductionId = searchParams.get('deduction_id');
  if (!deductionRecordId && !(employeeId && deductionId)) {
    return NextResponse.json({ error: 'Missing id or employee_id+deduction_id' }, { status: 400 });  }
  let query = getSupabaseServer()    .from('payroll_deductions')    .delete()    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));
  if (deductionRecordId) {
    query = query.eq('id', deductionRecordId);  } else {
    query = query.eq('employee_id', employeeId).eq('deduction_id', deductionId);  }
  const { error } = await query;  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });}
