import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { getNextVoucherNumber } from "@/lib/actions/accounting";

export const dynamic = "force-dynamic";

// El contexto sale de la empresa validada contra la sesion (empresa de la ruta,
// `?companyId` o cookie). El correlativo es POR EMPRESA (company_id), no global:
// antes `getNextVoucherNumber` no filtraba y devolvia el maximo de todas las
// empresas. Ver lib/actions/accounting.ts.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const voucherType = searchParams.get("voucherType");

    if (!voucherType) {
      return NextResponse.json(
        { error: "voucherType is required" },
        { status: 400 }
      );
    }

    const empresa = await contextoDeEmpresa(request);
    if (!empresa.tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    const nextNumber = await getNextVoucherNumber(voucherType, empresa.tenantId, empresa.companyId);

    return NextResponse.json({ nextNumber });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error getting next voucher number:", error);
    return NextResponse.json(
      { error: "Error getting next voucher number" },
      { status: 500 }
    );
  }
}
