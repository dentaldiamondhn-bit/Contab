import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Account id required" }, { status: 400 });
    }

    const empresa = await contextoDeEmpresa(request);
    const scope = filtroEmpresaOCompany(empresa);
    const supabase = createServiceRoleClient();

    // La cuenta debe pertenecer al ámbito de la petición; antes se podía
    // preguntar por cualquier id ajeno (sondeo entre empresas).
    const { data: owned } = await supabase
      .from("Account")
      .select("id")
      .match(scope)
      .eq("id", id)
      .maybeSingle();

    if (!owned) {
      const { data: ownedChart } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .match(scope)
        .eq("id", id)
        .maybeSingle();
      if (!ownedChart) {
        return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
      }
    }

    // Check JournalEntry table for this account
    const { count, error } = await supabase
      .from("JournalEntry")
      .select("*", { count: "exact", head: true })
      .or(`account_id.eq.${id},accountId.eq.${id}`);

    if (error) {
      return NextResponse.json({ hasTransactions: false });
    }

    return NextResponse.json({ hasTransactions: (count ?? 0) > 0 });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    return NextResponse.json({ hasTransactions: false });
  }
}
