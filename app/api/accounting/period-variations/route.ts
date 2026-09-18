import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";
import { getVariationsReport } from "@/lib/services/period-variations";

// GET /api/accounting/period-variations?tenantId=&from=YYYY-MM&to=YYYY-MM
// GET /api/accounting/period-variations?tenantId=&from=YYYY-MM&to=YYYY-MM&yoy&yoyYears=N
// Compara debe/haber/saldo por cuenta entre dos períodos contables.
// modo yoy=true: compara el mismo mes entre diferentes años (year-over-year)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId =
      searchParams.get("tenantId") || request.headers.get("x-tenant-id");
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const yoy = searchParams.get("yoy") === "true";
    const yoyYears = searchParams.get("yoyYears") ? Number(searchParams.get("yoyYears")) : undefined;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    const report = await getVariationsReport(getSupabaseServer(), tenantId, from, to, {
      yoy,
      yoyYears,
    });
    return NextResponse.json({ success: true, data: { report } });
  } catch (error) {
    console.error("Error in period-variations:", error);
    const message = error instanceof Error ? error.message : "Error interno";
    if (/requerido|formato|diferentes/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
