import { NextRequest, NextResponse } from 'next/server';
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
  const { id: companyId } = await params;
  let { data, error } = await supabase
    .from('payroll_config')
    .select('*')
    .eq('tenant_id', companyId)
    .single();
  if (error || !data) {
    const insertResult = await supabase
      .from('payroll_config')
      .upsert({ tenant_id: companyId, ...DEFAULT_CONFIG }, { onConflict: 'tenant_id' })
      .select()
      .single();
    if (insertResult.error) return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    return NextResponse.json(insertResult.data);
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { data, error } = await supabase
    .from('payroll_config')
    .upsert(
      {
        tenant_id: companyId,
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
    .from('payroll_config')
    .upsert(
      {
        tenant_id: companyId,
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
      { onConflict: 'tenant_id' }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
