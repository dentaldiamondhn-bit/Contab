import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import {
  balanceComprobacion,
  libroDiario,
  libroMayor,
  resumenIngresosEgresos,
} from "@/lib/accounting/libros";

/**
 * Libros contables del periodo.
 *
 * Antes esta ruta llamaba a cuatro funciones RPC de la 027c que **no existen**
 * en la base (PostgREST devuelve PGRST202), asi que las tres pestañas que la
 * consumen daban 500. Ahora se calculan en JS sobre las vistas de reportes, que
 * ya estan aisladas por `company_id` (ver `lib/accounting/libros.ts`).
 *
 * El nombre del libro sigue saliendo de una allowlist (`switch`), no de la
 * query, y la empresa se resuelve con `contextoDeEmpresa`, que valida
 * pertenencia y falla en cerrado si no puede determinarla: un 400 es mejor que
 * devolver el libro de otra empresa.
 */

const LIBROS = ["diario", "mayor", "balance", "resumen"] as const;
type Libro = (typeof LIBROS)[number];

export async function GET(request: NextRequest) {
  try {
    const empresa = await contextoDeEmpresa(request);
    const { searchParams } = new URL(request.url);
    const bookType = searchParams.get("bookType") as Libro;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const filterType = searchParams.get("filterType");
    const rango = { desde: startDate, hasta: endDate };

    if (!bookType || !LIBROS.includes(bookType)) {
      return NextResponse.json(
        { error: "Tipo de libro no válido. Use: diario, mayor, balance, resumen" },
        { status: 400 }
      );
    }

    if (!empresa.companyId) {
      throw Object.assign(new Error("No se pudo determinar la empresa de la peticion."), {
        status: 400,
      });
    }

    switch (bookType) {
      case "diario":
        return NextResponse.json(await libroDiario(empresa, { ...rango, tipo: filterType }));

      case "mayor": {
        const cuentas = await libroMayor(empresa);
        return NextResponse.json(
          filterType
            ? cuentas.filter((cuenta) => cuenta.account_type === filterType)
            : cuentas
        );
      }

      case "balance":
        return NextResponse.json(await balanceComprobacion(empresa));

      case "resumen":
        return NextResponse.json(await resumenIngresosEgresos(empresa, rango));
    }
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    const status = (error as { status?: number })?.status ?? 500;
    console.error("Error in integrated books:", error);
    return NextResponse.json(
      { error: status === 400 ? (error as Error).message : "Error processing request" },
      { status }
    );
  }
}

/**
 * Los libros ya no se materializan: se calculan al leerlos. Se mantiene el POST
 * para no romper a quien lo llame, pero responde que no hay nada que sincronizar
 * en vez de fingir que ejecuto funciones inexistentes.
 */
export async function POST(request: NextRequest) {
  try {
    const empresa = await contextoDeEmpresa(request);
    if (!empresa.companyId) {
      return NextResponse.json(
        { error: "No se pudo determinar la empresa de la peticion." },
        { status: 400 }
      );
    }
    return NextResponse.json({
      message: "Los libros se calculan al consultarlos; no hay nada que sincronizar.",
      results: [],
    });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    const status = (error as { status?: number })?.status ?? 500;
    console.error("Error syncing books:", error);
    return NextResponse.json(
      { error: status === 400 ? (error as Error).message : "Error syncing books" },
      { status }
    );
  }
}
