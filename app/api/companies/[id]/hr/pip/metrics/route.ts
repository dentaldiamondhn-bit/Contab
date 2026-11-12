import { NextRequest, NextResponse } from 'next/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { filtroEmpresaOCompany } from '@/lib/company-scope';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });

    const body = await request.json();
    const supabase = getSupabaseServer();

    // `pip_attendance_metrics` NO tiene columnas de empresa (medido: no existen
    // `company_id` ni `tenant_id`), solo `pip_plan_id`. Insertar con esas columnas
    // fallaba con `23503 column ... does not exist`. Lo que se valida es que el
    // plan del cuerpo sea de esta empresa, y se usa SU id.
    const { data: plan } = await supabase
      .from('pip_plans')
      .select('id')
      .eq('id', body.pipPlanId)
      .eq('tenant_id', empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa))
      .maybeSingle();
    if (!plan) {
      return NextResponse.json({ error: 'El plan no pertenece a esta empresa' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('pip_attendance_metrics')
      .insert({
        pip_plan_id: plan.id,
        period_start: body.periodStart,
        period_end: body.periodEnd,
        total_work_days: body.totalWorkDays || 0,
        present_days: body.presentDays || 0,
        absent_days: body.absentDays || 0,
        late_days: body.lateDays || 0,
        overtime_hours: body.overtimeHours || 0,
        disability_days: body.disabilityDays || 0,
        vacation_days: body.vacationDays || 0,
        absence_rate: body.totalWorkDays ? (body.absentDays / body.totalWorkDays) * 100 : 0,
        tardiness_rate: body.totalWorkDays ? (body.lateDays / body.totalWorkDays) * 100 : 0,
        attendance_score: body.totalWorkDays
          ? ((body.presentDays + body.lateDays) / body.totalWorkDays) * 100
          : 100,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, metrics: data });
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error in POST attendance metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID requerido' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    // `pip_attendance_metrics` no tiene columnas de empresa: el GET tambien
    // filtra por el embed `!inner` al plan, que si esta aislado. Con
    // `.eq("tenant_id")` sobre esta tabla la ruta fallaba con `42703`.
    const { data, error } = await supabase
      .from('pip_attendance_metrics')
      .select('*, pip_plans!inner(id, tenant_id, company_id)')
      .eq('pip_plan_id', planId)
      .eq('pip_plans.tenant_id', empresa.tenantId)
      .eq('pip_plans.company_id', empresa.companyId)
      .order('period_start', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error in GET attendance metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
