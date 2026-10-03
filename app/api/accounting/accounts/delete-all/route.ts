import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";

export async function DELETE(request: NextRequest) {
  try {
    const empresa = await contextoDeEmpresa(request);
    const scope = filtroEmpresaOCompany(empresa);

    const supabase = createServiceRoleClient();

    // Check if any account has transactions. Acotado a la empresa/tenant de la
    // peticion: antes tomaba `?tenantId` libre y borraba el plan de cuentas de
    // otra empresa sin comprobar pertenencia.
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .match(scope);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ deleted: 0, message: "No hay cuentas para eliminar" });
    }

    const accountIds = accounts.map(a => a.id);

    // Check for transactions across all accounts
    const { count } = await supabase
      .from("JournalEntry")
      .select("*", { count: "exact", head: true })
      .match(scope)
      .or([...accountIds.map(id => `account_id.eq.${id}`), ...accountIds.map(id => `accountId.eq.${id}`)].join(","));

    if ((count ?? 0) > 0) {
      return NextResponse.json({
        error: `No se puede eliminar: ${count} partidas contables están referenciadas a estas cuentas. Primero elimina los asientos contables.`,
      }, { status: 400 });
    }

    // Delete all accounts for this company/tenant
    const { error } = await supabase
      .from("chart_of_accounts")
      .delete()
      .match(scope);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ deleted: accounts.length });
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    return NextResponse.json({ error: error.message || "Error deleting accounts" }, { status: 500 });
  }
}
