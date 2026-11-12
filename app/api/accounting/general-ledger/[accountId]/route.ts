import { NextRequest, NextResponse } from "next/server";
import { getGeneralLedger } from "@/lib/actions/accounting";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;

    // Contexto validado contra la sesión: el mayor se filtra por empresa.
    const empresa = await contextoDeEmpresa(request);
    if (!empresa.tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    const generalLedger = await getGeneralLedger(accountId, startDate, endDate, {
      tenantId: empresa.tenantId,
      companyId: empresa.companyId,
    });

    return NextResponse.json(generalLedger);
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error fetching general ledger:", error);
    return NextResponse.json(
      { error: "Error fetching general ledger" },
      { status: 500 }
    );
  }
}
