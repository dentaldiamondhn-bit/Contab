import { NextRequest, NextResponse } from 'next/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { filtroEmpresaOCompany } from '@/lib/company-scope';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // El `[id]` de esta ruta es `companies.id`, NO `Tenant.id`. Antes se guardaba
    // en una variable llamada `tenantId` y se usaba en `.eq('tenant_id', ...)`, que
    // no da error: devuelve 0 filas, porque compara un UUID contra 'ANGELOH7'.
    // Esta ruta.devolvia una lista vacia sin avisar.
    // `contextoDeEmpresa` valida que esa empresa sea de la sesion (403 si no) y
    // devuelve el tenant real; `filtroEmpresaOCompany` ademas baja a `company_id`,
    // que es lo que separa a "test 1" de "test 2" dentro de TEST1DS.
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });

    const [empResult, posResult, deptResult, scheduleResult] = await Promise.all([
      // El empleado se filtra SOLO por `company_id`: los empleados con `tenant_id`
      // NULL (FK legacy a `tenants`) deben seguir apareciendo en su empresa.
      getSupabaseServer()
        .from('employees')
        .select('id, employee_code, first_name, last_name, position_id, department, base_salary, hire_date, status, work_schedule_id')
        .match(filtroEmpresaOCompany(empresa)),
      getSupabaseServer()
        .from('positions')
        .select('id, name')
        .eq('tenant_id', empresa.tenantId)
        .match(filtroEmpresaOCompany(empresa)),
      getSupabaseServer()
        .from('departments')
        .select('id, name')
        .eq('tenant_id', empresa.tenantId)
        .match(filtroEmpresaOCompany(empresa)),
      getSupabaseServer()
        .from('work_schedules')
        .select('id, name')
        .eq('tenant_id', empresa.tenantId)
        .match(filtroEmpresaOCompany(empresa)),
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

    const scheduleMap: Record<string, string> = {};
    if (scheduleResult.data) {
      scheduleResult.data.forEach((s: any) => { scheduleMap[s.id] = s.name; });
    }

    const data = (empResult.data || []).map((emp: any) => ({
      id: emp.id,
      employeeCode: emp.employee_code || '',
      name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      position: posMap[emp.position_id] || '',
      department: deptMap[emp.department] || emp.department || '',
      salary: parseFloat(emp.base_salary) || 0,
      startDate: emp.hire_date || '',
      status: emp.status || 'active',
      workScheduleId: emp.work_schedule_id || null,
      workScheduleName: scheduleMap[emp.work_schedule_id] || '',
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Payroll employees error:', error);
    return NextResponse.json({ error: error.message || 'Error fetching employees' }, { status: 500 });
  }
}
