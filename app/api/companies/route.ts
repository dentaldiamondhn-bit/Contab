import { NextResponse } from "next/server";
import { empresasDelUsuario, usuarioAppId } from "@/lib/workspace";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

/**
 * GET /api/companies
 *
 * Lista SOLO las empresas a las que el usuario tiene acceso según
 * `user_company_access` (la misma fuente de verdad que /api/workspace).
 *
 * Antes esta ruta filtraba por `User.tenantid` y leía la tabla `companies`,
 * que no existe en el esquema real. Además, un contador administra empresas de
 * varios tenants, así que filtrar por un único tenant dejaba fuera la mitad de
 * su cartera. Ahora se listan sus empresas reales desde `Company`.
 *
 * El esquema real de empresas es:
 *   Company(id, name, tenantId, description, isActive, createdAt, updatedAt)
 * y los datos fiscales viven en `tenants` (business_name, business_rtn,
 * business_email, phone_number, ...).
 */

type Empresa = Awaited<ReturnType<typeof empresasDelUsuario>>[number];

function claveTenant(valor: unknown): string {
  return String(valor ?? "").trim();
}

export async function GET() {
  try {
    const userId = await usuarioAppId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const empresas = await empresasDelUsuario(userId);
    if (empresas.length === 0) {
      return NextResponse.json({ companies: [] });
    }

    const supabase = getSupabaseServer() as any;

    const [{ data: filas, error: errorEmpresas }, { data: tenants }] = await Promise.all([
      supabase
        .from("Company")
        .select("id, name, tenantId, description, isActive, createdAt")
        .in("id", empresas.map((e) => e.id)),
      supabase.from("tenants").select("*"),
    ]);

    if (errorEmpresas) {
      console.error("[api/companies] error leyendo Company:", errorEmpresas);
      return NextResponse.json({ error: "Error obteniendo empresas" }, { status: 500 });
    }

    const porId = new Map<string, any>();
    for (const fila of Array.isArray(filas) ? filas : []) {
      porId.set(String(fila.id), fila);
    }

    // `Company.tenantId` usa indistintamente el id de `tenants` y el
    // tenant_code legacy, así que se indexan las dos claves.
    const tenantsPorClave = new Map<string, any>();
    for (const t of Array.isArray(tenants) ? tenants : []) {
      if (t.id) tenantsPorClave.set(claveTenant(t.id), t);
      if (t.tenant_code) tenantsPorClave.set(claveTenant(t.tenant_code), t);
    }

    const companies = await Promise.all(
      empresas.map(async (empresa: Empresa) => {
        const company = porId.get(empresa.id);
        const tenantKey = claveTenant(company?.tenantId ?? empresa.tenant_id);
        const tenant = tenantsPorClave.get(tenantKey) ?? null;

        // Los contadores reales de esta app están en Transaction/Account por
        // company_id. Las tablas `polizas`/`companies` del código anterior no
        // existen. Si una tabla falla, el contador cae a 0 sin romper la lista.
        const [tx, cuentas] = await Promise.all([
          supabase
            .from("Transaction")
            .select("id", { count: "exact", head: true })
            .eq("company_id", empresa.id),
          supabase
            .from("Account")
            .select("id", { count: "exact", head: true })
            .eq("company_id", empresa.id),
        ]);

        const nombre = company?.name ?? empresa.name ?? tenant?.business_name ?? "Sin nombre";
        const rtn = tenant?.business_rtn ?? empresa.rtn ?? "";

        return {
          id: empresa.id,
          tenant_id: tenantKey,
          tenantId: tenantKey,
          business_name: nombre,
          business_rtn: rtn,
          industry: "",
          regimen_tributario: "Régimen General",
          actividad_economica: "",
          direccion_fiscal: "",
          telefono_fiscal: tenant?.phone_number ?? "",
          email_fiscal: tenant?.business_email ?? "",
          is_active: company?.isActive !== false,
          created_at: company?.createdAt ?? null,
          config_fiscal: null,
          description: company?.description ?? null,
          relationship: empresa.relationship,
          is_default: empresa.is_default,
          _count: {
            polizas: Number(tx?.count ?? 0),
            accounts: Number(cuentas?.count ?? 0),
          },
        };
      })
    );

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error in companies API:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = String(body?.id ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "ID de empresa requerido" }, { status: 400 });
    }

    const userId = await usuarioAppId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const empresas = await empresasDelUsuario(userId);
    const empresa = empresas.find((e) => e.id === id);
    if (!empresa) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    const supabase = getSupabaseServer() as any;

    // Campos que SÍ existen en la tabla real Company.
    const companyUpdates: Record<string, any> = {};
    if (body.business_name !== undefined) companyUpdates.name = body.business_name;
    if (body.description !== undefined) companyUpdates.description = body.description;
    if (body.is_active !== undefined) companyUpdates.isActive = Boolean(body.is_active);

    let company: any = null;
    if (Object.keys(companyUpdates).length > 0) {
      const { data, error } = await supabase
        .from("Company")
        .update(companyUpdates)
        .eq("id", id)
        .select("id, name, tenantId, description, isActive, createdAt")
        .maybeSingle();
      if (error) {
        console.error("[api/companies] error actualizando Company:", error);
        return NextResponse.json({ error: "Error actualizando empresa" }, { status: 500 });
      }
      company = data;
    } else {
      const { data } = await supabase
        .from("Company")
        .select("id, name, tenantId, description, isActive, createdAt")
        .eq("id", id)
        .maybeSingle();
      company = data;
    }

    const tenantKey = claveTenant(company?.tenantId ?? empresa.tenant_id);
    let tenant: any = null;
    if (tenantKey) {
      const porId = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantKey)
        .maybeSingle();
      if (!porId.error && porId.data) {
        tenant = porId.data;
      } else {
        const porCodigo = await supabase
          .from("tenants")
          .select("*")
          .eq("tenant_code", tenantKey)
          .maybeSingle();
        if (!porCodigo.error) tenant = porCodigo.data;
      }
    }

    // Campos fiscales/de contacto: solo `tenants` tiene columnas reales para
    // ellos. `business_name` NO se propaga al tenant porque un tenant puede
    // agrupar varias empresas (test 1 / test 2 comparten TEST1DS).
    const tenantUpdates: Record<string, any> = {};
    if (body.business_rtn !== undefined) tenantUpdates.business_rtn = body.business_rtn;
    if (body.email_fiscal !== undefined || body.business_email !== undefined) {
      tenantUpdates.business_email = body.email_fiscal ?? body.business_email;
    }
    if (body.telefono_fiscal !== undefined || body.phone_number !== undefined) {
      tenantUpdates.phone_number = body.telefono_fiscal ?? body.phone_number;
    }
    if (body.is_active !== undefined) tenantUpdates.is_active = Boolean(body.is_active);

    if (tenant?.id && Object.keys(tenantUpdates).length > 0) {
      const { error: errorTenant } = await supabase
        .from("tenants")
        .update(tenantUpdates)
        .eq("id", tenant.id);
      if (errorTenant) {
        console.error("[api/companies] error actualizando tenants:", errorTenant);
        return NextResponse.json({ error: "Error actualizando datos fiscales" }, { status: 500 });
      }
      tenant = { ...tenant, ...tenantUpdates };
    }

    const nombre = company?.name ?? empresa.name ?? tenant?.business_name ?? "Sin nombre";
    const rtn = tenant?.business_rtn ?? empresa.rtn ?? "";

    const responseCompany = {
      id,
      tenant_id: tenantKey,
      tenantId: tenantKey,
      business_name: nombre,
      business_rtn: rtn,
      industry: "",
      regimen_tributario: "Régimen General",
      actividad_economica: "",
      direccion_fiscal: "",
      telefono_fiscal: tenant?.phone_number ?? "",
      email_fiscal: tenant?.business_email ?? "",
      is_active: company?.isActive !== false,
      created_at: company?.createdAt ?? null,
      config_fiscal: null,
      description: company?.description ?? null,
      relationship: empresa.relationship,
      is_default: empresa.is_default,
      _count: { polizas: 0, accounts: 0 },
    };

    return NextResponse.json({ company: responseCompany });
  } catch (error) {
    console.error("API: Error in PUT method:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
