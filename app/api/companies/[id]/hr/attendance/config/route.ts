import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';


const DEFAULT_CONFIG = {
  absent_percent: 100,
  late_threshold_minutes: 0,
  late_deduction_amount: 0,
  unpaid_leave_percent: 100,
  disability_percent: 100,
  overtime_rate_multiplier: 2,
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  let { data, error } = await supabase
    .from('attendance_deduction_config')
    .select('*')
    .eq('tenant_id', companyId)
    .single();

  if (error || !data) {
    const { data: created, error: insertError } = await supabase
      .from('attendance_deduction_config')
      .upsert({ tenant_id: companyId, ...DEFAULT_CONFIG }, { onConflict: 'tenant_id' })
      .select()
      .single();
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json(created);
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { data, error } = await supabase
    .from('attendance_deduction_config')
    .upsert(
      {
        tenant_id: companyId,
        absent_percent: body.absent_percent,
        late_threshold_minutes: body.late_threshold_minutes,
        late_deduction_amount: body.late_deduction_amount,
        unpaid_leave_percent: body.unpaid_leave_percent,
        disability_percent: body.disability_percent,
        overtime_rate_multiplier: body.overtime_rate_multiplier,
      },
      { onConflict: 'tenant_id' }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { data, error } = await supabase
    .from('attendance_deduction_config')
    .upsert(
      {
        tenant_id: companyId,
        absent_percent: body.absent_percent,
        late_threshold_minutes: body.late_threshold_minutes,
        late_deduction_amount: body.late_deduction_amount,
        unpaid_leave_percent: body.unpaid_leave_percent,
        disability_percent: body.disability_percent,
        overtime_rate_multiplier: body.overtime_rate_multiplier,
      },
      { onConflict: 'tenant_id' }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
