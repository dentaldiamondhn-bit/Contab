import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);

  const q = (searchParams.get('q') || '').toLowerCase();
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
    // Fetch all employees for tenant, filter in JS
    const { data: allEmployees, error } = await supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', companyId);

    if (error) {
      console.error('Employee search error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let filtered = allEmployees || [];

    // Text search
    if (q) {
      filtered = filtered.filter(e =>
        (e.first_name || '').toLowerCase().includes(q) ||
        (e.last_name || '').toLowerCase().includes(q) ||
        (e.id_number || '').toLowerCase().includes(q) ||
        (e.employee_id || '').toLowerCase().includes(q) ||
        (e.position || '').toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q) ||
        (e.phone || '').toLowerCase().includes(q)
      );
    }

    // Exact filters
    if (department) filtered = filtered.filter(e => e.department === department);
    if (position) filtered = filtered.filter(e => e.position === position);
    if (status) filtered = filtered.filter(e => e.status === status);
    if (contractType) filtered = filtered.filter(e => e.contract_type === contractType);
    if (gender) filtered = filtered.filter(e => e.gender === gender);

    // Sort
    filtered.sort((a, b) => {
      let va: string, vb: string;
      switch (sortBy) {
        case 'name':
          va = `${a.last_name || ''} ${a.first_name || ''}`;
          vb = `${b.last_name || ''} ${b.first_name || ''}`;
          break;
        case 'salary':
          va = String(a.base_salary || 0);
          vb = String(b.base_salary || 0);
          break;
        case 'hire_date':
          va = a.hire_date || '';
          vb = b.hire_date || '';
          break;
        case 'department':
          va = a.department || '';
          vb = b.department || '';
          break;
        default:
          va = a[sortBy] || '';
          vb = b[sortBy] || '';
      }
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === 'desc' ? -cmp : cmp;
    });

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    // Get distinct departments and positions
    const departments = [...new Set(filtered.map(e => e.department).filter(Boolean))].sort();
    const positions = [...new Set(filtered.map(e => e.position).filter(Boolean))].sort();

    return NextResponse.json({
      employees: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters: { departments, positions },
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
