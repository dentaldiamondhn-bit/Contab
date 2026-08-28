import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function DELETE(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get("tenantId");
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

    const supabase = createServiceRoleClient();

    // Check if any account has transactions
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("tenant_id", tenantId);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ deleted: 0, message: "No hay cuentas para eliminar" });
    }

    const accountIds = accounts.map(a => a.id);

    // Check for transactions across all accounts
    const { count } = await supabase
      .from("JournalEntry")
      .select("*", { count: "exact", head: true })
      .or(accountIds.map(id => `account_id.eq.${id}`).join(","),
          accountIds.map(id => `accountId.eq.${id}`).join(","));

    if ((count ?? 0) > 0) {
      return NextResponse.json({
        error: `No se puede eliminar: ${count} partidas contables están referenciadas a estas cuentas. Primero elimina los asientos contables.`,
      }, { status: 400 });
    }

    // Delete all accounts for this tenant
    const { error, count: deleted } = await supabase
      .from("chart_of_accounts")
      .delete()
      .eq("tenant_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ deleted: accounts.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error deleting accounts" }, { status: 500 });
  }
}
