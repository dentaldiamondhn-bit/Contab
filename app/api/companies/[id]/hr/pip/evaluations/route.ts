import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = request.headers.get('x-tenant-id');
    const planId = searchParams.get('planId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    let query = supabase
      .from('pip_evaluations')
      .select('*, pip_goals(title)')
      .order('evaluation_date', { ascending: false });

    if (planId) {
      query = query.eq('pip_plan_id', planId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error in GET evaluations:', error);
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

    const { data, error } = await supabase
      .from('pip_evaluations')
      .insert({
        pip_plan_id: body.pipPlanId,
        goal_id: body.goalId || null,
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

    if (body.goalId && body.progressPct !== undefined) {
      await supabase
        .from('pip_goals')
        .update({
          current_value: body.progressPct,
          status: body.progressPct >= 100 ? 'met' : body.progressPct > 0 ? 'in_progress' : 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.goalId);
    }

    return NextResponse.json({ success: true, evaluation: data });
  } catch (error: any) {
    console.error('Error in POST evaluation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluationId = searchParams.get('evaluationId');

    if (!evaluationId) {
      return NextResponse.json({ error: 'Evaluation ID requerido' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { error } = await supabase.from('pip_evaluations').delete().eq('id', evaluationId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE evaluation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
