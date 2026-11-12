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
  const { searchParams } = new URL(request.url);  const date = searchParams.get('date');  const start = searchParams.get('start');  const end = searchParams.get('end');
  let query = getSupabaseServer()    .from('attendance')    .select('*')    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));
  if (date) {
    query = query.eq('date', date);  } else if (start && end) {
    query = query.gte('date', start).lte('date', end);  }
  const { data, error } = await query.order('date', { ascending: false });  if (error) return NextResponse.json([], { status: 200 });
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
  const body = await request.json();  const { data, error } = await getSupabaseServer()    .from('attendance')    .upsert(
      {
        tenant_id: empresa.tenantId, company_id: empresa.companyId,
        employee_id: body.employee_id,
        date: body.date,
        status: body.status,
        amount: body.amount || 0,
        hours: body.hours || 0,
        overtime_amount: body.overtime_amount || 0,
        overtime_hours: body.overtime_hours || 0,
        holiday_type: body.holiday_type || null,
        disability_type: body.disability_type || null,
        notes: body.notes || '',      },
      { onConflict: 'tenant_id,employee_id,date' }
    )    .select()    .single();  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  const body = await request.json();  const { id, ...updates } = body;  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });  const { error } = await getSupabaseServer()    .from('attendance')    .update({
      employee_id: updates.employee_id,
      date: updates.date,
      status: updates.status,
      amount: updates.amount,
      overtime_amount: updates.overtime_amount,
      overtime_hours: updates.overtime_hours,
      holiday_type: updates.holiday_type,
      disability_type: updates.disability_type,
      notes: updates.notes,    })    .eq('id', id)    .eq("tenant_id", empresa.tenantId)
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
  const { searchParams } = new URL(request.url);  const recordId = searchParams.get('id');  if (!recordId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });  const { error } = await getSupabaseServer()    .from('attendance')    .delete()    .eq('id', recordId)    .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const body = await request.json();  const records = body.records as Array<{
    employee_id: string;
    date: string;
    status: string;
    amount?: number;
    hours?: number;
    overtime_amount?: number;
    overtime_hours?: number;
    holiday_type?: string | null;
    disability_type?: string | null;
    notes?: string;  }>;
  if (!records || !Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: 'Missing records array' }, { status: 400 });  }
  const rows = records.map(r => ({
    tenant_id: empresa.tenantId, company_id: empresa.companyId,
    employee_id: r.employee_id,
    date: r.date,
    status: r.status,
    amount: r.amount || 0,
    hours: r.hours || 0,
    overtime_amount: r.overtime_amount || 0,
    overtime_hours: r.overtime_hours || 0,
    holiday_type: r.holiday_type || null,
    disability_type: r.disability_type || null,
    notes: r.notes || '',  }));
  const { data, error } = await getSupabaseServer()    .from('attendance')    .upsert(rows, { onConflict: 'tenant_id,employee_id,date' })    .select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: data?.length || 0 });}
