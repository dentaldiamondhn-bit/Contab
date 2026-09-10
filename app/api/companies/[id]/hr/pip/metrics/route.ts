import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 });
    }

    const body = await request.json();
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from('pip_attendance_metrics')
      .insert({
        pip_plan_id: body.pipPlanId,
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
    console.error('Error in POST attendance metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = request.headers.get('x-tenant-id');
    const planId = searchParams.get('planId');

    if (!tenantId || !planId) {
      return NextResponse.json({ error: 'Tenant ID y Plan ID requeridos' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('pip_attendance_metrics')
      .select('*')
      .eq('pip_plan_id', planId)
      .order('period_start', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error in GET attendance metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
