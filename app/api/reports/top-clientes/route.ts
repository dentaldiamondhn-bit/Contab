import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function GET(request: NextRequest) {
  // El tenant NO viene de `?tenantId`. Ese parametro lo manda el cliente y se
  // aceptaba tal cual, sin comprobar nada, asi que cualquier usuario autenticado
  // podia leer este reporte de otro tenant con `?tenantId=ANGELOH7`.
  // Peor aun dentro de un tenant: TEST1DS tiene "test 1" y "test 2", y filtrando
  // solo por `tenant_id` cada empresa veia el reporte de la hermana.
  // `contextoDeEmpresa` sale de la sesion y valida la pertenencia; encima,
  // `filtroEmpresaOCompany` baja a `company_id`, que es lo que separa empresas.
  //
  // La vista expone `company_id` desde la 027, pero la vista NO es la frontera:
  // el servicio usa SERVICE_ROLE_KEY, que salta el RLS. Sin el `.match()` de
  // abajo, el filtro por empresa no existe aunque la columna este ahi.
  const empresa = await contextoDeEmpresa(request);
  if (!empresa.tenantId) {
    return NextResponse.json({ error: "Falta el tenant de la empresa" }, { status: 400 });
  }

  const { data, error } = await getSupabaseServer()
    .from("top_clientes")
    .select("*")
    .eq("tenant_id", empresa.tenantId)
    .match(filtroEmpresaOCompany(empresa))
    .order("total_ventas", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
