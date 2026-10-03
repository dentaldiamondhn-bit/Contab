import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";
import {
  applyOpeningBalances,
  computeOpeningBalances,
  validateYear,
} from "@/lib/services/opening-balance";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";

// POST /api/accounting/opening-balances/auto { year, apply?, overwrite? }
// Sin apply (o false): vista previa (no escribe). Con apply:true: traslada los
// saldos de cierre del año previo como apertura del 1-ene del año indicado.
// El contexto se valida contra la sesión; el cálculo y el candado se aíslan por
// empresa (company_id), no por tenant.
export async function POST(request: NextRequest) {
  try {
    const empresa = await contextoDeEmpresa(request);
    if (!empresa.tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }
    const body = await request.json();
    const year = Number(body?.year);
    try {
      validateYear(year);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "year inválido" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServer();
    if (!body?.apply) {
      const preview = await computeOpeningBalances(supabase, empresa.tenantId, year, empresa.companyId);
      return NextResponse.json({ success: true, preview });
    }
    const result = await applyOpeningBalances(supabase, empresa.tenantId, year, {
      overwrite: !!body?.overwrite,
      by: request.headers.get("x-user-email") || "system",
      companyId: empresa.companyId,
    });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error in opening-balances auto:", error);
    const message = error instanceof Error ? error.message : "Error interno";
    if (/requerido|inválido|entero|Sin movimientos|cerrado|bloqueado|Reábralo/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
