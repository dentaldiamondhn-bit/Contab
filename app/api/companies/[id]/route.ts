import { NextRequest, NextResponse } from "next/server";
import { empresasDelUsuario, usuarioAppId } from "@/lib/workspace";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

/**
 * GET /api/companies/[id]
 *
 * Devuelve la empresa pedida SIEMPRE que esté entre las que el usuario
 * administra (`user_company_access`). Es el mismo criterio que /api/workspace.
 *
 * Antes esta ruta consultaba las tablas `Tenant` y `companies`, que no existen
 * en el esquema real, así que respondía 404 para todas las empresas. De ahí
 * salían los 404 en /companies/[id]/modules y en los libros/reportes, que usan
 * este endpoint para resolver el nombre y el RTN de la empresa.
 *
 * El esquema real es `Company(id, name, tenantId, ...)` y
 * `tenants(id, business_name, business_rtn, tenant_code, ...)`.
 *
 * La respuesta mantiene las dos convenciones de nombres que ya consumen las
 * pantallas (`business_name`/`businessname` y `name`), más un objeto `company`
 * anidado con la misma forma para quien haga `data.company || data`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const companyId = String(rawId || "").trim();

    const userId = await usuarioAppId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    const empresas = await empresasDelUsuario(userId);

    // Se acepta el id de `Company` (lo normal en las URLs) y, por
    // compatibilidad, un tenant_code cuando resuelve a UNA sola empresa del
    // usuario. Si el código agrupa varias (TEST1DS -> test 1/test 2) no se
    // adivina: devolver la primera mostraría datos de la empresa equivocada.
    const porId = empresas.find((e) => e.id === companyId);
    const delMismoTenant = empresas.filter((e) => e.tenant_id === companyId);
    const acceso = porId ?? (delMismoTenant.length === 1 ? delMismoTenant[0] : undefined);

    if (!acceso) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    const supabase = getSupabaseServer() as any;

    const { data: company, error } = await supabase
      .from("Company")
      .select("id, name, tenantId, description, isActive")
      .eq("id", acceso.id)
      .maybeSingle();

    if (error) {
      console.error("[api/companies/[id]] error leyendo Company:", error);
      return NextResponse.json({ error: "Error obteniendo empresa" }, { status: 500 });
    }

    // `Company.tenantId` guarda tanto el id de `tenants` como el tenant_code
    // legacy ("TEST1DS", "DENTALWD"). Se prueban ambos por separado para no
    // depender de un `.or()` con valores que podrían traer comas.
    let tenant: any = null;
    const tenantKey = String(company?.tenantId ?? acceso.tenant_id ?? "");
    if (tenantKey) {
      const porIdTenant = await supabase
        .from("tenants")
        .select("id, business_name, business_rtn, tenant_code, business_email, phone_number")
        .eq("id", tenantKey)
        .maybeSingle();
      if (!porIdTenant.error && porIdTenant.data) {
        tenant = porIdTenant.data;
      } else {
        const porCodigo = await supabase
          .from("tenants")
          .select("id, business_name, business_rtn, tenant_code, business_email, phone_number")
          .eq("tenant_code", tenantKey)
          .maybeSingle();
        if (!porCodigo.error) tenant = porCodigo.data;
      }
    }

    const businessName = company?.name ?? acceso.name ?? tenant?.business_name ?? "Sin nombre";
    const businessRtn = tenant?.business_rtn ?? acceso.rtn ?? "";

    const respuesta = {
      id: String(company?.id ?? acceso.id),
      tenant_id: String(company?.tenantId ?? acceso.tenant_id ?? ""),
      tenantId: String(company?.tenantId ?? acceso.tenant_id ?? ""),
      tenant_code: tenant?.tenant_code ?? null,
      business_name: businessName,
      business_rtn: businessRtn,
      business_email: tenant?.business_email ?? "",
      business_address: "",
      business_phone: tenant?.phone_number ?? "",
      name: businessName,
      rtn: businessRtn,
      description: company?.description ?? null,
      is_active: company?.isActive !== false,
    };

    return NextResponse.json({
      ...respuesta,
      company: respuesta,
    });
  } catch (error) {
    console.error("Error getting company:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
