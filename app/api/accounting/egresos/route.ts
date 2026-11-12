import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { comprobantesPorTipo } from "@/lib/accounting/libros";

/**
 * Libro de egresos. Mismo caso que `ingresos/route.ts`: la consulta anterior
 * usaba columnas y relaciones que no existen en el esquema real. Ahora sale de
 * `v_transacciones_cierre`, aislada por `company_id`.
 */
export async function GET(request: NextRequest) {
  try {
    const empresa = await contextoDeEmpresa(request);
    const { searchParams } = new URL(request.url);

    if (!empresa.companyId) {
      return NextResponse.json(
        { error: "No se pudo determinar la empresa de la peticion." },
        { status: 400 }
      );
    }

    const egresos = await comprobantesPorTipo(empresa, "EGRESO", {
      desde: searchParams.get("startDate"),
      hasta: searchParams.get("endDate"),
    });

    return NextResponse.json(egresos);
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error fetching egresos:", error);
    return NextResponse.json({ error: "Error fetching egresos" }, { status: 500 });
  }
}
