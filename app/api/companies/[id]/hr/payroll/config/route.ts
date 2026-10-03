import { NextRequest, NextResponse } from 'next/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

const DEFAULT_CONFIG = {
  frequency: 'quincenal',
  igss_employee: 3.19,
  igss_employer: 4.12,
  ihss: 2.5,
  rap: 1.5,
  currency: 'HNL',
  quincenal_day1: 15,
  quincenal_day2: 30,
  aguinaldo_percent: 8.33,
  bono14_percent: 8.33,
  vacation_days: 12,
  igss_quincena: 'ambas',
  ihss_quincena: 'ambas',
  rap_quincena: 'ambas',
};
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // El `[id]` de esta ruta es `companies.id`, NO `Tenant.id`. Pasarlo a
  // `.eq("tenant_id", ...)` no da error: devuelve 0 filas, y estas pantallas
  // salian vacias sin avisar. `contextoDeEmpresa` valida la pertenencia (403
  // si la empresa no es de la sesion) y devuelve el tenant real.
  //
  // La config es por EMPRESA (migracion 035: `payroll_config` tiene UNIQUE
  // (company_id), ya no por tenant). Por eso se filtra por `company_id` y no
  // se compara `tenant_id`: asi "test 1" y "test 2" (mismo tenant) no comparten
  // ni se pisan la configuracion.
  let empresa;
  try {
    empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    throw error;
  }
  let { data, error } = await getSupabaseServer()
    .from('payroll_config')
    .select('*')
    .match(filtroEmpresaOCompany(empresa))
    .single();
  if (error || !data) {
    const insertResult = await getSupabaseServer()
      .from('payroll_config')
      .upsert({ tenant_id: empresa.tenantId, company_id: empresa.companyId, ...DEFAULT_CONFIG }, { onConflict: 'company_id' })
      .select()
      .single();
    if (insertResult.error) return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    return NextResponse.json(insertResult.data);
  }
  return NextResponse.json(data);
}
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
  const { data, error } = await getSupabaseServer()
    .from('payroll_config')
    .upsert(
      {
        tenant_id: empresa.tenantId, company_id: empresa.companyId,
        frequency: body.frequency,
        igss_employee: body.igss_employee,
        igss_employer: body.igss_employer,
        ihss: body.ihss,
        rap: body.rap,
        currency: body.currency,
        quincenal_day1: body.quincenal_day1,
        quincenal_day2: body.quincenal_day2,
        aguinaldo_percent: body.aguinaldo_percent,
        bono14_percent: body.bono14_percent,
        vacation_days: body.vacation_days,
        igss_quincena: body.igss_quincena,
        ihss_quincena: body.ihss_quincena,
        rap_quincena: body.rap_quincena,
      },
      { onConflict: 'company_id' }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
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
  const body = await request.json();
  const { data, error } = await getSupabaseServer()
    .from('payroll_config')
    .upsert(
      {
        tenant_id: empresa.tenantId, company_id: empresa.companyId,
        frequency: body.frequency,
        igss_employee: body.igss_employee,
        igss_employer: body.igss_employer,
        ihss: body.ihss,
        rap: body.rap,
        currency: body.currency,
        quincenal_day1: body.quincenal_day1,
        quincenal_day2: body.quincenal_day2,
        aguinaldo_percent: body.aguinaldo_percent,
        bono14_percent: body.bono14_percent,
        vacation_days: body.vacation_days,
        igss_quincena: body.igss_quincena,
        ihss_quincena: body.ihss_quincena,
        rap_quincena: body.rap_quincena,
      },
      { onConflict: 'company_id' }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
