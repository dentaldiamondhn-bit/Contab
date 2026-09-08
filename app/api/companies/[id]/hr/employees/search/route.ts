import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);

  const q = searchParams.get('q') || '';
  const department = searchParams.get('department') || '';
  const position = searchParams.get('position') || '';
  const status = searchParams.get('status') || '';
  const contractType = searchParams.get('contractType') || '';
  const gender = searchParams.get('gender') || '';
  const sortBy = searchParams.get('sortBy') || 'last_name';
  const sortDir = searchParams.get('sortDir') || 'asc';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from('employees')
      .select('*', { count: 'exact' })
      .eq('tenant_id', companyId);

    // Text search across multiple fields
    if (q) {
      query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,id_number.ilike.%${q}%,employee_id.ilike.%${q}%,position.ilike.%${q}%,department.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    // Exact filters
    if (department) query = query.eq('department', department);
    if (position) query = query.eq('position', position);
    if (status) query = query.eq('status', status);
    if (contractType) query = query.eq('contract_type', contractType);
    if (gender) query = query.eq('gender', gender);

    // Sort
    const ascending = sortDir === 'asc';
    if (sortBy === 'name') {
      query = query.order('last_name', { ascending }).order('first_name', { ascending });
    } else if (sortBy === 'salary') {
      query = query.order('base_salary', { ascending });
    } else if (sortBy === 'hire_date') {
      query = query.order('hire_date', { ascending });
    } else if (sortBy === 'department') {
      query = query.order('department', { ascending }).order('last_name', { ascending });
    } else {
      query = query.order(sortBy, { ascending });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Employee search error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get distinct departments and positions for filter dropdowns
    const [deptRes, posRes] = await Promise.all([
      supabase.from('employees').select('department').eq('tenant_id', companyId).not('department', 'is', null),
      supabase.from('employees').select('position').eq('tenant_id', companyId).not('position', 'is', null),
    ]);

    const departments = [...new Set((deptRes.data || []).map(d => d.department).filter(Boolean))].sort();
    const positions = [...new Set((posRes.data || []).map(p => p.position).filter(Boolean))].sort();

    return NextResponse.json({
      employees: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      filters: { departments, positions },
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
