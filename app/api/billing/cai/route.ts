import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { exigirEmpresa } from "@/lib/purchase-db";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";
import { previewInvoiceNumber } from "@/lib/billing/invoice-number";

export async function sinCai(companyId: string, conDebug = false) {
  const preview = await previewInvoiceNumber(companyId);
  return {
    cai: preview.caiCode,
    currentNumber: preview.correlativo,
    finalNumber: 1000,
    issueDate: new Date().toISOString().split("T")[0],
    expirationDate: null,
    daysRemaining: 365,
    status: "active",
    ...(conDebug ? { _debug: { fallback: true } } : {}),
  };
}

// El POST caia a "1" y ademas desactivaba los CAI de ese tenant antes de
// insertar, asi que crear un CAI desde otra empresa apagaba los de "Empresa 1".
// Ahora la frontera es la EMPRESA (`company_id`), no el tenant: test 1 y test 2
// comparten `TEST1DS` y llevan series/CAI distintos. El contexto sale del
// servidor (`contextoDeEmpresa` valida pertenencia); el `?companyId`/body es solo
// una pista que se comprueba, no la autoridad. Ver lib/tenant-resolver.ts.

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));

    // CAI vigente de ESTA empresa, con maybeSingle para no dar 500 si no hay.
    const { data: cai, error } = await supabase
      .from("cai")
      .select("*")
      .eq("status", "active")
      .eq("company_id", empresa.companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;

    if (!cai) {
      return NextResponse.json(await sinCai(empresa.companyId, true));
    }

    // El correlativo lo decide el servidor con la serie de ESTA empresa.
    const preview = await previewInvoiceNumber(empresa.companyId);
    const diasRestantes = preview.venceEl
      ? Math.ceil((preview.venceEl.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 365;

    const caiInfo = {
      cai: preview.caiCode,
      currentNumber: preview.correlativo,
      finalNumber: Number.isFinite(Number(cai.rango_final)) && Number(cai.rango_final) > 0
        ? Number(cai.rango_final)
        : Number(cai.end_number) || preview.rangoHasta || 1000,
      issueDate: cai.issue_date,
      expirationDate: preview.venceEl ? preview.venceEl.toISOString() : null,
      daysRemaining: Math.max(0, diasRestantes),
      status: diasRestantes <= 0 ? "expired" : diasRestantes <= 30 ? "warning" : "active",
      _debug: {
        calculatedNumber: preview.correlativo,
        startNumber: cai.rango_inicial ?? cai.start_number,
      },
    };

    return NextResponse.json(caiInfo);
  } catch (error: any) {
    const deEmpresa = respuestaDeErrorDeEmpresa(error);
    if (deEmpresa) return deEmpresa;
    console.error("Error in CAI route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cai, startNumber, endNumber, expirationDate } = body;

    const supabase = getSupabaseServer();

    // Empresa del contexto (header de sesion), validada. Sin empresa es 400 en
    // vez de escribir en "Empresa 1".
    const empresa = exigirEmpresa(
      await contextoDeEmpresa(request, { companyIdDeRuta: body.companyId || body.tenant_id })
    );

    // Apaga solo los CAI de ESTA empresa (antes apagaba los del tenant entero).
    const { error: deactivateError } = await supabase
      .from("cai")
      .update({ status: "inactive" })
      .eq("company_id", empresa.companyId);
    if (deactivateError) throw deactivateError;

    const { data, error } = await supabase
      .from("cai")
      .insert({
        cai,
        start_number: startNumber,
        end_number: endNumber,
        expiration_date: expirationDate,
        issue_date: new Date().toISOString().split("T")[0],
        status: "active",
        tenant_id: empresa.tenantId,
        company_id: empresa.companyId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    const deEmpresa = respuestaDeErrorDeEmpresa(error);
    if (deEmpresa) return deEmpresa;
    console.error("Error in CAI POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
