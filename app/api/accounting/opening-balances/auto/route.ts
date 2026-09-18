import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";
import {
  applyOpeningBalances,
  computeOpeningBalances,
  validateYear,
} from "@/lib/services/opening-balance";

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get("x-tenant-id") || new URL(request.url).searchParams.get("tenantId")
  );
}

// POST /api/accounting/opening-balances/auto { year, apply?, overwrite? }
// Sin apply (o false): vista previa (no escribe). Con apply:true: traslada los
// saldos de cierre del año previo como apertura del 1-ene del año indicado.
export async function POST(request: NextRequest) {
  try {
    const tenantId = tenantHint(request);
    if (!tenantId) {
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
      const preview = await computeOpeningBalances(supabase, tenantId, year);
      return NextResponse.json({ success: true, preview });
    }
    const result = await applyOpeningBalances(supabase, tenantId, year, {
      overwrite: !!body?.overwrite,
      by: request.headers.get("x-user-email") || "system",
    });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error in opening-balances auto:", error);
    const message = error instanceof Error ? error.message : "Error interno";
    if (/requerido|inválido|entero|Sin movimientos|cerrado|bloqueado|Reábralo/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
