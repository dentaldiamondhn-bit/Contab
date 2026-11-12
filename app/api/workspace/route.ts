import { NextRequest, NextResponse } from "next/server";
import { ErrorDeEmpresa } from "@/lib/tenant-resolver";
import {
  empresasDelUsuario,
  ubicacionesDeEmpresa,
  rolDeEmpresa,
  esMultiEmpresa,
  usuarioAppId,
} from "@/lib/workspace";

/**
 * GET /api/workspace
 *
 * Que devuelve el estado inicial del contexto: a que empresas entra este
 * usuario, cual es el rol, y las sedes de cada empresa.
 *
 * Es la unica fuente de verdad para el selector. No se deduce de
 * `Tenant.companies` porque ahi las empresas cuelgan de UN tenant, y el contador
 * administra empresas de varios: quedaria fuera medio caso.
 *
 *   ?companyId=...   opcional, para pedir el contexto de una empresa concreta
 *   ?locationId=...  opcional, la sede activa
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await usuarioAppId();
    if (!userId) {
      return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
    }

    const empresas = await empresasDelUsuario(userId);
    if (empresas.length === 0) {
      return NextResponse.json(
        {
          error: "Tu usuario no tiene ninguna empresa asignada.",
          empresas: [],
          rol: null,
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    // Misma precedencia que `contextoDeEspacio`: query primero, luego el header
    // que `middleware.ts` deriva de la cookie `active_company_id`. Sin el header,
    // tras un reload el servidor caia a `empresas[0]` y el selector mostraba una
    // empresa distinta de la del `[id]` de la URL, que es la que usan las rutas.
    const pedida = searchParams.get("companyId") ?? request.headers.get("x-company-id");
    const activa = (pedida ? empresas.find((e) => e.id === pedida) : undefined) ?? empresas[0];

    const locations = await ubicacionesDeEmpresa(activa.id);
    const role = rolDeEmpresa(activa);
    const pedidaSede = searchParams.get("locationId");
    const locationId = locations.some((l) => l.id === pedidaSede) ? pedidaSede : null;

    return NextResponse.json({
      role,
      multiEmpresa: esMultiEmpresa(empresas),
      activeCompanyId: activa.id,
      activeLocationId: locationId,
      // El contador no puede consolidar entre empresas. Se manda igual la lista
      // de empresas para el selector, pero el flag le dice a la UI que no
      // existe una vista global para el.
      permiteConsolidar: role === "business_owner",
      empresas,
      locations,
    });
  } catch (e) {
    if (e instanceof ErrorDeEmpresa) {
      return NextResponse.json({ error: e.message }, { status: e.estado });
    }
    console.error("[api/workspace] error inesperado:", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
