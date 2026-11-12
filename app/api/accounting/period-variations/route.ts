import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";
import { getVariationsReport } from "@/lib/services/period-variations";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";

// GET /api/accounting/period-variations?from=YYYY-MM&to=YYYY-MM[&yoy&yoyYears=N]
// Compara debe/haber/saldo por cuenta entre dos períodos contables.
// El contexto (empresa/sede) se valida contra la sesión; el reporte se filtra
// por empresa (company_id) y cae a tenant_id solo si no hay empresa.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const yoy = searchParams.get("yoy") === "true";
    const yoyYears = searchParams.get("yoyYears") ? Number(searchParams.get("yoyYears")) : undefined;

    const empresa = await contextoDeEmpresa(request);
    if (!empresa.tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    const report = await getVariationsReport(
      getSupabaseServer(),
      { tenantId: empresa.tenantId, companyId: empresa.companyId },
      from,
      to,
      { yoy, yoyYears },
    );
    return NextResponse.json({ success: true, data: { report } });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error in period-variations:", error);
    const message = error instanceof Error ? error.message : "Error interno";
    if (/requerido|formato|diferentes|empresa/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
