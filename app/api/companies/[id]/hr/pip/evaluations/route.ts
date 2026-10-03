import { NextRequest, NextResponse } from 'next/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { filtroEmpresaOCompany } from '@/lib/company-scope';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

// Esta ruta era la peor del arbol de RRHH, y el patron automatico la dejo a medias:
//
// - El GET construia la query con `.order()` y NUNCA filtraba por empresa ni por
//   tenant. Con el service role debajo, `pip_evaluations` entero era visible
//   para cualquier sesion. Esto no devolvia cero filas: devolvia de mas.
// - El POST insertaba sin `tenant_id` ni `company_id` (comprobaba que existiera
//   el header pero no lo usaba) y despues hacia
//   `pip_goals.update().eq('id', goalId)` a secas: con un `goalId` de otra
//   empresa se modificaba igual (IDOR).
// - El DELETE si filtra, por el patron automatico.
//
// MEDIDO en el esquema: `pip_evaluations`, `pip_goals`, `pip_evidence` y
// `pip_attendance_metrics` NO tienen columnas `company_id` ni `tenant_id`. Solo
// existen en `pip_plans`, de donde cuelgan por FK. Filtrarlas por empresa revienta
// con `42703 column pip_evaluations_1.company_id does not exist`, que es como se
// detecta. Aqui el aislamiento va por el embed `!inner` al plan: solo entran las
// filas cuyo plan es de la empresa de la ruta.
//
// La empresa sale del `[id]` de la ruta, validado contra `user_company_access`.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    const supabase = getSupabaseServer();
    // `pip_evaluations` NO tiene `company_id` ni `tenant_id` (medido: las
    // columnas no existen), solo `pip_plan_id`. Filtrar por empresa sobre la
    // tabla daba `42703`. El aislamiento va por el embed `!inner` al plan, que
    // si esta aislado, de modo que solo entran las evaluaciones de planes de
    // esta empresa.
    let query = supabase
      .from('pip_evaluations')
      .select('*, pip_goals(title), pip_plans!inner(id, tenant_id, company_id)')
      .eq('pip_plans.tenant_id', empresa.tenantId)
      .eq('pip_plans.company_id', empresa.companyId)
      .order('evaluation_date', { ascending: false });
    if (planId) {
      query = query.eq('pip_plan_id', planId);
    }
    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error in GET evaluations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });

    const body = await request.json();
    const supabase = getSupabaseServer();

    // `pip_evaluations` no tiene columnas de empresa: se valida que el plan
    // sea de esta empresa ANTES de insertar, y se copia el `pip_plan_id` del
    // cuerpo solo si ha pasado esa comprobacion.
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

    // El objetivo se valida ANTES de insertar, y contra ESTE plan, no solo contra
    // "alguna empresa". Tres cosas que estaban mal y ici se arreglan:
    //
    // 1. La validacion era DESPUES del insert (linea ~105 en la version anterior):
    //    se escribia la evaluacion y luego se comprobaba el goal, asi que un
    //    `goalId` de otra empresa devolvia 403 dejando la fila ya insertada.
    // 2. Solo se comprobaba que el goal fuera de *esta empresa*, no del *mismo
    //    plan*: se podia colgar una evaluacion del plan A en un goal del plan B.
    // 3. El bloque entero (validacion incluida) estaba dentro de
    //    `if (goalId && progressPct !== undefined)`, pero el `goal_id` se escribe
    //    siempre. Sin `progressPct`, el `goal_id` de otra empresa se guardaba
    //    sin comprobar nada.
    //
    // Comprobar por `pip_plan_id` cubre los tres casos de golpe: si el goal es de
    // este plan, es de esta empresa (el plan ya se valido arriba con
    // `filtroEmpresaOCompany`), y no puede ser de otro plan.
    let goalValidado: { id: string } | null = null;
    if (body.goalId) {
      const { data: goal, error: errorGoal } = await supabase
        .from('pip_goals')
        .select('id')
        .eq('id', body.goalId)
        .eq('pip_plan_id', plan.id)
        .limit(1);
      if (errorGoal) throw errorGoal;
      if (!goal || goal.length === 0) {
        return NextResponse.json(
          { error: 'El objetivo no pertenece a este plan' },
          { status: 403 }
        );
      }
      goalValidado = goal[0];
    }

    const { data, error } = await supabase
      .from('pip_evaluations')
      .insert({
        pip_plan_id: plan.id,
        goal_id: goalValidado?.id ?? null,
        evaluation_date: body.evaluationDate,
        score: body.score,
        progress_pct: body.progressPct,
        comments: body.comments || '',
        evaluator: body.evaluator,
        attendance_summary: body.attendanceSummary || null,
      })
      .select()
      .single();
    if (error) throw error;

    if (goalValidado && body.progressPct !== undefined) {
      // El update va tambien filtrado por `pip_plan_id`. Antes era
      // `.eq('id', body.goalId)` a secas y su seguridad dependia por completo de
      // la validacion de arriba; asi, aunque alguien laquite esa comprobacion, el
      // update sigue sin poder tocar un goal de otro plan.
      await supabase
        .from('pip_goals')
        .update({
          current_value: body.progressPct,
          status: body.progressPct >= 100 ? 'met' : body.progressPct > 0 ? 'in_progress' : 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalValidado.id)
        .eq('pip_plan_id', plan.id);
    }

    return NextResponse.json({ success: true, evaluation: data });
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error in POST evaluation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
    const { searchParams } = new URL(request.url);
    const evaluationId = searchParams.get('evaluationId');
    if (!evaluationId) {
      return NextResponse.json({ error: 'Evaluation ID requerido' }, { status: 400 });
    }
    const supabase = getSupabaseServer();
    // `pip_evaluations` no tiene columnas de empresa: se comprueba que su plan
    // sea de esta empresa con el embed `!inner` y, solo si es, se borra.
    // Filtrar la tabla por empresa daba `42703` (columna inexistente).
    const { data: objetivo } = await supabase
      .from('pip_evaluations')
      .select('id, pip_plans!inner(id, tenant_id, company_id)')
      .eq('id', evaluationId)
      .eq('pip_plans.tenant_id', empresa.tenantId)
      .eq('pip_plans.company_id', empresa.companyId)
      .maybeSingle();

    if (!objetivo) {
      return NextResponse.json(
        { error: 'La evaluacion no pertenece a esta empresa' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('pip_evaluations')
      .delete()
      .eq('id', evaluationId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error in DELETE evaluation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
