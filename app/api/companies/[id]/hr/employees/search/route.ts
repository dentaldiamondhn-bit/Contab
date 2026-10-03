import { NextRequest, NextResponse } from 'next/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // El `[id]` de esta ruta es `companies.id`, NO `Tenant.id`. Pasarlo a
  // `.eq("tenant_id", ...)` no da error: devuelve 0 filas, y estas pantallas
  // salian vacias sin avisar. `contextoDeEmpresa` valida la pertenencia (403
  // si la empresa no es de la sesion) y devuelve el tenant real.
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
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
    // Fetch all employees for tenant, filter in JS
    const [{ data: allEmployees, error }, { data: schedules }] = await Promise.all([
      getSupabaseServer()
        .from('employees')
        .select('*')
      .match(filtroEmpresaOCompany(empresa)),
      getSupabaseServer()
        .from('work_schedules')
        .select('id, name')
        .eq("tenant_id", empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa)),
    ]);
    if (error) {
      console.error('Employee search error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const scheduleMap: Record<string, string> = {};
    if (schedules) {
      schedules.forEach((s: any) => { scheduleMap[s.id] = s.name; });
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
      employees: paginated.map((e: any) => ({ ...e, work_schedule_name: scheduleMap[e.work_schedule_id] || '' })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters: { departments, positions },
    });
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
