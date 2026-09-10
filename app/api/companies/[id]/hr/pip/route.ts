import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

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
      return NextResponse.json(plan);
    }

    let query = supabase
      .from('pip_plans')
      .select('*, pip_goals(id, title, status, target_value, current_value, due_date), pip_evaluations(id, evaluation_date, score, progress_pct)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
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

    return NextResponse.json({ success: true, plan });
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
          });
        }
      }
    }

    return NextResponse.json({ success: true, plan: data });
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
