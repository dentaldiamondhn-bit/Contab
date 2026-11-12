import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { comprobantesPorTipo } from "@/lib/accounting/libros";

/**
 * Libro de ingresos.
 *
 * Antes consultaba `Transaction` con `.eq("voucherType", ...)` y un embed
 * `JournalEntry -> Account(code)`. Ninguna de esas columnas existe en el
 * esquema real (PostgREST devolvia 42703/PGRST200 y la ruta respondia 500).
 * Ahora sale de la vista `v_transacciones_cierre`, filtrando por empresa en la
 * propia consulta.
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

    const ingresos = await comprobantesPorTipo(empresa, "INGRESO", {
      desde: searchParams.get("startDate"),
      hasta: searchParams.get("endDate"),
    });

    return NextResponse.json(ingresos);
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error fetching ingresos:", error);
    return NextResponse.json({ error: "Error fetching ingresos" }, { status: 500 });
  }
}
