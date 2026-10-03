import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa } from "@/lib/tenant-resolver";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

// Los cuatro libros que consume esta ruta. Es una allowlist: `functionName` sale
// del `switch`, nunca de la query, para que no se pueda invocar otra RPC por
// parametro. Tras la 027c las ocho funciones contables exigen `p_company_id`.
const LIBROS = {
  diario: "get_libro_diario_integrado",
  mayor: "get_libro_mayor_integrado",
  balance: "get_balance_comprobacion_integrado",
  resumen: "get_resumen_ingresos_egresos",
} as const;

type Libro = keyof typeof LIBROS;

/**
 * Resuelve la empresa validando pertenencia y **falla en cerrado si no puede
 * determinarla**.
 *
 * Antes esta ruta sacaba el tenant de `x-tenant-id` o de `?tenantId` sin
 * comprobar nada: `?tenantId=ANGELOH7` bastaba para leer el libro de otra
 * empresa. Y como la 027c exige `p_company_id` (sin DEFAULT), no hay forma de
 * llamar a las funciones sin empresa: es mejor un 400 que un reporte con datos
 * de la empresa hermana.
 */
async function empresaValidada(
  request: NextRequest,
  companyIdDeRuta?: string
): Promise<{ companyId: string; tenantId: string | null }> {
  const empresa = await contextoDeEmpresa(request, { companyIdDeRuta });

  if (!empresa.companyId) {
    throw Object.assign(new Error("No se pudo determinar la empresa de la peticion."), {
      status: 400,
    });
  }
  return { companyId: empresa.companyId, tenantId: empresa.tenantId ?? null };
}

/**
 * Red de seguridad, no el filtro. La 027c ya garantiza que las funciones devuelven
 * una sola empresa, pero esta ruta es el unico consumidor y aqui el nombre de la
 * funcion viene de una allowlist: si alguien vuelve a crear una version sin
 * aislar, esta comprobacion lo delata en vez de pintar el balance de otra empresa
 * sin avisar.
 */
function datosDeEstaEmpresa(data: unknown, companyId: string) {
  if (!Array.isArray(data)) return [];
  const empresaDeFila = (fila: Record<string, unknown>) => fila.company_id;

  const filtrados = (data as Record<string, unknown>[]).filter((fila) => {
    const deQuien = empresaDeFila(fila);
    return deQuien === null || deQuien === undefined || deQuien === companyId;
  });

  const fugadas = data.length - filtrados.length;
  if (fugadas > 0) {
    throw Object.assign(
      new Error(
        `Fuga entre empresas: ${fugadas} fila(s) de otro company_id en ${companyId}. ` +
          "La funcion contable no esta aislada; revisar la 027c."
      ),
      { status: 500 }
    );
  }
  return filtrados;
}

// Libro diario integrado
export async function GET(request: NextRequest) {
  try {
    const empresa = await empresaValidada(request);

    const { searchParams } = new URL(request.url);
    const bookType = searchParams.get("bookType") as Libro;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const filterType = searchParams.get("filterType");

    if (!bookType || !(bookType in LIBROS)) {
      return NextResponse.json(
        { error: "Tipo de libro no válido. Use: diario, mayor, balance, resumen" },
        { status: 400 }
      );
    }

    const params: any = {
      p_company_id: empresa.companyId,
      p_tenant_id: empresa.tenantId ?? null,
    };
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;

    switch (bookType) {
      case "diario":
        if (filterType) params.p_tipo_filtro = filterType;
        break;
      case "mayor":
        if (filterType) params.p_tipo_cuenta = filterType;
        break;
    }

    const functionName = LIBROS[bookType];
    const { data, error } = await getSupabaseServer().rpc(functionName, params);

    if (error) {
      console.error(`Error fetching ${bookType}:`, error);
      console.error("Function:", functionName, "Params:", params);
      return NextResponse.json(
        { error: `Error fetching ${bookType}: ${error.message || error.details || "Unknown error"}` },
        { status: 500 }
      );
    }

    const filas = datosDeEstaEmpresa(data, empresa.companyId);

    // Transform flat data into hierarchical structure for diario bookType
    if (bookType === "diario") {
      const grouped = filas.reduce((acc: any[], row: any) => {
        // Create a unique key for each transaction
        const key = `${row.fecha}-${row.numero_comprobante}`;

        // Find existing entry or create new one
        let entry = acc.find((e) => e.id === key);
        if (!entry) {
          entry = {
            id: key,
            date: row.fecha,
            voucher_type: row.tipo_comprobante,
            voucher_number: row.numero_comprobante,
            description: row.descripcion,
            reference: "",
            total_amount: 0,
            entries: [],
          };
          acc.push(entry);
        }

        // Add line item to entry
        const lineId = `${key}-${row.codigo_cuenta}`;
        entry.entries.push({
          id: lineId,
          account_code: row.codigo_cuenta,
          account_name: row.nombre_cuenta,
          account_type: "",
          debit: parseFloat(row.debe) || 0,
          credit: parseFloat(row.haber) || 0,
          description: row.descripcion_asiento,
        });

        // Update total amount
        entry.total_amount += (parseFloat(row.debe) || 0) + (parseFloat(row.haber) || 0);

        return acc;
      }, []);

      return NextResponse.json(grouped);
    }

    return NextResponse.json(filas);
  } catch (error) {
    const status = (error as { status?: number })?.status ?? 500;
    console.error("Error in integrated books:", error);
    return NextResponse.json(
      { error: status === 400 ? (error as Error).message : "Error processing request" },
      { status }
    );
  }
}

// Sincronizar libros (forzar actualización de vistas integradas)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action !== "sync") {
      return NextResponse.json({ error: "Acción no válida. Use: sync" }, { status: 400 });
    }

    // `companyIdDeRuta` no es una confianza: `contextoDeEmpresa` lo compara con el
    // tenant de la sesion y lanza 403 si no es de la cuenta. Por eso puede venir
    // del body del POST.
    const empresa = await empresaValidada(request, body.companyId);

    const supabase = getSupabaseServer();
    const params = {
      p_company_id: empresa.companyId,
      p_tenant_id: empresa.tenantId ?? null,
    };

    const results = [];
    for (const functionName of Object.values(LIBROS)) {
      const { error } = await supabase.rpc(functionName, params as any);
      results.push({
        function: functionName,
        status: error ? "error" : "success",
        error: error?.message,
      });
    }

    return NextResponse.json({ message: "Sincronización completada", results });
  } catch (error) {
    const status = (error as { status?: number })?.status ?? 500;
    console.error("Error syncing books:", error);
    return NextResponse.json(
      { error: status === 400 ? (error as Error).message : "Error syncing books" },
      { status }
    );
  }
}
