import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

function mapPlan(p: any) {
  if (!p) return p;
  return {
    ...p,
    employeeId: p.employee_id,
    startDate: p.start_date,
    endDate: p.end_date,
    createdBy: p.created_by,
    reviewedBy: p.reviewed_by,
    originalEndDate: p.original_end_date,
    tenantId: p.tenant_id,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    pip_goals: p.pip_goals?.map((g: any) => ({
      ...g,
      pipPlanId: g.pip_plan_id,
      targetValue: g.target_value,
      currentValue: g.current_value,
      dueDate: g.due_date,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    })),
    pip_evaluations: p.pip_evaluations?.map((e: any) => ({
      ...e,
      pipPlanId: e.pip_plan_id,
      goalId: e.goal_id,
      evaluationDate: e.evaluation_date,
      score: e.score,
      progressPct: e.progress_pct,
      comments: e.comments,
      evaluator: e.evaluator,
      attendanceSummary: e.attendance_summary,
      createdAt: e.created_at,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = request.headers.get('x-tenant-id') || searchParams.get('tenantId');
    const planId = searchParams.get('planId');
    const employeeId = searchParams.get('employeeId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    if (planId) {
      const { data: plan, error } = await supabase
        .from('pip_plans')
        .select('*, pip_goals(*), pip_evaluations(*, pip_goals(title)), pip_evidence(*)')
        .eq('id', planId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return NextResponse.json(mapPlan(plan));
    }

    let query = supabase
      .from('pip_plans')
      .select('*, pip_goals(*), pip_evaluations(*)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json((data || []).map(mapPlan));
  } catch (error: any) {
    console.error('Error in GET /api/hr/pip:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 });
    }

    const body = await request.json();
    const supabase = getSupabaseServer();

    const { data: plan, error: planError } = await supabase
      .from('pip_plans')
      .insert({
        tenant_id: tenantId,
        employee_id: body.employeeId,
        title: body.title,
        description: body.description,
        status: body.status || 'draft',
        start_date: body.startDate,
        end_date: body.endDate,
        observations: body.observations || '',
        commitments: body.commitments || '',
        created_by: body.createdBy || 'Sistema',
      })
      .select()
      .single();

    if (planError) throw planError;

    if (body.goals?.length > 0) {
      const goals = body.goals.map((g: any) => ({
        pip_plan_id: plan.id,
        title: g.title,
        description: g.description || '',
        metric: g.metric,
        target_value: g.targetValue,
        current_value: g.currentValue || 0,
        unit: g.unit || 'porcentaje',
        due_date: g.dueDate || body.endDate,
        status: g.status || 'pending',
        commitments: g.commitments || '',
      }));

      const { error: goalsError } = await supabase.from('pip_goals').insert(goals);
      if (goalsError) throw goalsError;
    }

    return NextResponse.json({ success: true, plan: mapPlan(plan) });
  } catch (error: any) {
    console.error('Error in POST /api/hr/pip:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 });
    }

    const body = await request.json();
    const supabase = getSupabaseServer();

    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status) updateData.status = body.status;
    if (body.startDate) updateData.start_date = body.startDate;
    if (body.endDate) updateData.end_date = body.endDate;
    if (body.reviewedBy) updateData.reviewed_by = body.reviewedBy;
    if (body.observations !== undefined) updateData.observations = body.observations;
    if (body.commitments !== undefined) updateData.commitments = body.commitments;

    const { data, error } = await supabase
      .from('pip_plans')
      .update(updateData)
      .eq('id', body.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    if (body.goals) {
      for (const g of body.goals) {
        if (g.id) {
          await supabase
            .from('pip_goals')
            .update({
              title: g.title,
              description: g.description,
              metric: g.metric,
              target_value: g.targetValue,
              current_value: g.currentValue,
              unit: g.unit,
              due_date: g.dueDate,
              status: g.status,
              commitments: g.commitments || '',
              updated_at: new Date().toISOString(),
            })
            .eq('id', g.id);
        } else {
          await supabase.from('pip_goals').insert({
            pip_plan_id: body.id,
            title: g.title,
            description: g.description || '',
            metric: g.metric,
            target_value: g.targetValue,
            current_value: g.currentValue || 0,
            unit: g.unit || 'porcentaje',
            due_date: g.dueDate || body.endDate,
            status: g.status || 'pending',
            commitments: g.commitments || '',
          });
        }
      }
    }

    return NextResponse.json({ success: true, plan: mapPlan(data) });
  } catch (error: any) {
    console.error('Error in PUT /api/hr/pip:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!tenantId || !planId) {
      return NextResponse.json({ error: 'Tenant ID y Plan ID requeridos' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('pip_plans')
      .delete()
      .eq('id', planId)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/hr/pip:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
