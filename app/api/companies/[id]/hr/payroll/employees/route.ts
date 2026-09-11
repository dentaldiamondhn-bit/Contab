import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tenantId } = await params;

  const [empResult, posResult, deptResult] = await Promise.all([
    getSupabaseServer()
      .from('employees')
      .select('id, employee_code, first_name, last_name, position_id, department, base_salary, hire_date, status')
      .eq('tenant_id', tenantId),
    getSupabaseServer()
      .from('positions')
      .select('id, name')
      .eq('tenant_id', tenantId),
    getSupabaseServer()
      .from('departments')
      .select('id, name')
      .eq('tenant_id', tenantId),
  ]);

  if (empResult.error) {
    return NextResponse.json({ error: empResult.error.message }, { status: 500 });
  }

  const posMap: Record<string, string> = {};
  if (posResult.data) {
    posResult.data.forEach((p: any) => { posMap[p.id] = p.name; });
  }

  const deptMap: Record<string, string> = {};
  if (deptResult.data) {
    deptResult.data.forEach((d: any) => { deptMap[d.id] = d.name; });
  }

  const data = (empResult.data || []).map((emp: any) => ({
    id: emp.id,
    name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
    position: posMap[emp.position_id] || '',
    department: deptMap[emp.department] || emp.department || '',
    salary: parseFloat(emp.base_salary) || 0,
    startDate: emp.hire_date || '',
    status: emp.status || 'active',
  }));

  return NextResponse.json(data);
}
