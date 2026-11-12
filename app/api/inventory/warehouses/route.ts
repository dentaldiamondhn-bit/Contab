import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export const dynamic = "force-dynamic";

// Esta ruta resolvia solo el tenant. `warehouse` guarda `company_id`, y como
// test 1 y test 2 comparten `TEST1DS`, el listado de bodegas y el stock que
// calculan las dos empresas venian mezclados. El POST era peor: hacia
// `resolveTenant(request) || body.tenant_id`, o sea que el cuerpo de la
// peticion decidia en que empresa se guardaba la bodega, y no se comprobaba
// pertenencia. Ahora el contexto se valida (403) y el `company_id` se escribe
// explicito en el INSERT.

// GET - Obtener bodegas/almacenes
export async function GET(request: NextRequest) {
  try {
    const empresa = await contextoDeEmpresa(request);
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    const { data: warehouses, error } = await getSupabaseServer()
      .from("warehouse")
      .select("*")
      .eq("tenant_id", tenantId)
      .match(filtroEmpresaOCompany(empresa))
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching warehouses:", error);
      return NextResponse.json(
        { error: "Error fetching warehouses" },
        { status: 500 }
      );
    }

    return NextResponse.json(warehouses);
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error in warehouses GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Crear bodega
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, location, description } = body;

    const empresa = await contextoDeEmpresa(request);
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    const { data: warehouse, error } = await (getSupabaseServer() as any)
      .from("warehouse")
      .insert({
        tenant_id: tenantId,
        ...(empresa.companyId ? { company_id: empresa.companyId } : {}),
        code,
        name,
        location,
        description,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating warehouse:", error);
      return NextResponse.json(
        { error: "Error creating warehouse" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      warehouse,
      message: "Bodega creada exitosamente",
    });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error in warehouses POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
