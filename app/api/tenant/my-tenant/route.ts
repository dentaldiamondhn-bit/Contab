import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

/**
 * GET/PATCH /api/tenant/my-tenant
 *
 * Perfil de la empresa con la que trabaja el usuario. La fuente de verdad es
 * `user_company_access` -> `Company` -> `tenants`; NO `User.tenantid`, porque un
 * contador administra empresas de varios tenants y `User.tenantid` solo apunta a
 * uno de ellos.
 *
 * Antes esta ruta leía `Tenant` y `companies`. `Tenant` existe pero está vacía y
 * `companies` no existe en el esquema real, así que respondía 404 a todos los
 * usuarios. Ese 404 ensuciaba /companies/[id]/accounting, /account/profile,
 * /account/billing y /billing/subscriptions.
 */

type Supabase = any;

function clave(valor: unknown): string {
  return String(valor ?? "").trim();
}

type EmpresaResuelta = {
  id: string;
  name: string | null;
  tenantId: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string | null;
  relationship?: string;
  is_default?: boolean;
};

/** Empresa por defecto del usuario (o la primera ordenada de forma estable). */
async function empresaDelUsuario(supabase: Supabase, userId: string): Promise<EmpresaResuelta | null> {
  const { data, error } = await supabase
    .from("user_company_access")
    .select(
      "company_id, relationship, is_default, Company(id, name, tenantId, description, isActive, createdAt)"
    )
    .eq("user_id", userId)
    .in("relationship", ["owner", "accountant"]);

  if (error || !Array.isArray(data)) return null;

  const empresas = data
    .map((fila: any) => {
      const c = Array.isArray(fila.Company) ? fila.Company[0] : fila.Company;
      if (!c) return null;
      return {
        id: String(c.id),
        name: c.name ?? null,
        tenantId: clave(c.tenantId),
        description: c.description ?? null,
        isActive: c.isActive !== false,
        createdAt: c.createdAt ?? null,
        relationship: fila.relationship,
        is_default: Boolean(fila.is_default),
      } as EmpresaResuelta;
    })
    .filter(Boolean) as EmpresaResuelta[];

  empresas.sort((a, b) => {
    if (Boolean(a.is_default) !== Boolean(b.is_default)) return a.is_default ? -1 : 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  return empresas[0] ?? null;
}

/** `Company.tenantId` guarda el id de `tenants` o el tenant_code legacy. */
async function tenantPorClave(supabase: Supabase, key: string): Promise<any | null> {
  if (!key) return null;

  const porId = await supabase.from("tenants").select("*").eq("id", key).maybeSingle();
  if (!porId.error && porId.data) return porId.data;

  const porCodigo = await supabase
    .from("tenants")
    .select("*")
    .eq("tenant_code", key)
    .maybeSingle();
  if (!porCodigo.error) return porCodigo.data;

  return null;
}

async function resolverContexto(userIdClerk: string) {
  const supabase = getSupabaseServer() as Supabase;

  // `authid` no tiene índice único: se toma la primera fila de forma estable.
  const { data: usuarios, error } = await supabase
    .from("User")
    .select("id, tenantId, email, name")
    .eq("authid", userIdClerk)
    .order("id", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`No se pudo resolver el usuario: ${error.message}`);
  }

  const usuario = Array.isArray(usuarios) ? usuarios[0] : usuarios;
  if (!usuario?.id) return { supabase, usuario: null, empresa: null, tenant: null };

  const empresa = await empresaDelUsuario(supabase, String(usuario.id));
  const empresaKey = empresa?.tenantId ?? "";
  const usuarioKey = clave(usuario.tenantId);

  let tenant = await tenantPorClave(supabase, empresaKey);
  if (!tenant && usuarioKey && usuarioKey !== empresaKey) {
    tenant = await tenantPorClave(supabase, usuarioKey);
  }

  return { supabase, usuario, empresa, tenant };
}

export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { usuario, empresa, tenant } = await resolverContexto(userId);

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no tiene tenant asociado", hasTenant: false },
        { status: 404 }
      );
    }

    const tenantKey = empresa?.tenantId ?? clave(usuario.tenantId);

    if (!empresa && !tenant) {
      return NextResponse.json(
        { error: "Usuario no tiene tenant asociado", hasTenant: false },
        { status: 404 }
      );
    }

    // paymentMethod / plan se guardan en Clerk publicMetadata desde el
    // onboarding, porque `tenants` no tiene columnas para ellos.
    let paymentMethod: string | null = null;
    let planDeMetadata: string | null = null;
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      const meta = (clerkUser.publicMetadata ?? {}) as any;
      paymentMethod = meta.paymentMethod || meta.selectedPaymentMethod || null;
      planDeMetadata = meta.subscriptionPlan || meta.selectedPlan || meta.pendingPlan || null;
    } catch {}

    // `tenant_plans` no existe en este esquema. Se devuelve [] para que los
    // consumidores usen el plan del tenant/metadata en vez de romperse.
    const allPlans: any[] = [];
    const subscriptionPlan =
      (tenant as any)?.subscription_plan ??
      (tenant as any)?.subscriptionplan ??
      planDeMetadata ??
      null;

    const createdAt = tenant?.created_at ?? empresa?.createdAt ?? null;

    const tenantData = {
      id: tenant?.id ?? tenantKey ?? empresa?.id ?? null,
      businessName: empresa?.name ?? tenant?.business_name ?? "Mi Empresa",
      tenantCode: tenant?.tenant_code ?? tenantKey ?? null,
      businessEmail: tenant?.business_email ?? "",
      businessRTN: tenant?.business_rtn ?? "",
      phoneNumber: tenant?.phone_number ?? "",
      businessAddress: "",
      industry: "",
      maxUsers: Number((tenant as any)?.max_users ?? 5),
      maxStorage: Number((tenant as any)?.max_storage ?? 0),
      isActive: tenant?.is_active !== false && empresa?.isActive !== false,
      createdAt,
      created_at: createdAt,
      updatedAt: tenant?.updated_at ?? null,
      paymentMethod,
      subscriptionPlan,
      plans: allPlans,
      // Contexto útil para las pantallas nuevas sin romper a las viejas.
      companyId: empresa?.id ?? null,
      relationship: empresa?.relationship ?? null,
    };

    return NextResponse.json({ hasTenant: true, tenant: tenantData });
  } catch (error: any) {
    console.error("Error getting user tenant:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { supabase, usuario, empresa, tenant } = await resolverContexto(userId);

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no tiene tenant asociado" }, { status: 404 });
    }

    const persisted: string[] = [];
    const ignored: string[] = [];

    // 1) Company: campos que sí existen en la tabla real.
    const companyUpdates: Record<string, any> = {};
    if (body.businessName !== undefined) companyUpdates.name = body.businessName;
    if (body.isActive !== undefined) companyUpdates.isActive = Boolean(body.isActive);

    if (empresa?.id && Object.keys(companyUpdates).length > 0) {
      const { error } = await supabase.from("Company").update(companyUpdates).eq("id", empresa.id);
      if (error) {
        console.error("[api/tenant/my-tenant] error actualizando Company:", error);
        return NextResponse.json({ error: "Error actualizando empresa" }, { status: 500 });
      }
      persisted.push(...Object.keys(companyUpdates));
    }

    // 2) tenants: datos fiscales y de contacto. Solo si existe la fila.
    const tenantUpdates: Record<string, any> = {};
    if (body.businessRTN !== undefined) tenantUpdates.business_rtn = body.businessRTN;
    if (body.businessEmail !== undefined) tenantUpdates.business_email = body.businessEmail;
    if (body.phoneNumber !== undefined) tenantUpdates.phone_number = body.phoneNumber;
    if (body.isActive !== undefined) tenantUpdates.is_active = Boolean(body.isActive);

    if (tenant?.id && Object.keys(tenantUpdates).length > 0) {
      const { error } = await supabase.from("tenants").update(tenantUpdates).eq("id", tenant.id);
      if (error) {
        console.error("[api/tenant/my-tenant] error actualizando tenants:", error);
        return NextResponse.json({ error: "Error actualizando datos fiscales" }, { status: 500 });
      }
      persisted.push(...Object.keys(tenantUpdates));
    } else if (Object.keys(tenantUpdates).length > 0) {
      // No hay fila en `tenants` para esta empresa (p. ej. TEST1DS/DENTALWD).
      // No se crea una a espaldas del usuario: se informa qué no se guardó.
      ignored.push(...Object.keys(tenantUpdates));
    }

    // Campos sin columna en Company/tenants.
    for (const campo of ["businessAddress", "industry", "maxUsers", "maxStorage", "tenantCode"]) {
      if (body[campo] !== undefined) ignored.push(campo);
    }

    // 3) paymentMethod y plan viven en Clerk publicMetadata.
    const metaUpdates: Record<string, any> = {};
    if (body.paymentMethod !== undefined) metaUpdates.paymentMethod = body.paymentMethod;

    const planNuevo = body.pendingPlan || body.subscriptionPlan || body.planCode || body.plan;
    if (planNuevo) {
      const nextCycle = new Date();
      nextCycle.setMonth(nextCycle.getMonth() + 1);
      nextCycle.setDate(1);
      nextCycle.setHours(0, 0, 0, 0);
      metaUpdates.pendingPlan = planNuevo;
      metaUpdates.pendingPlanEffectiveDate = nextCycle.toISOString();
      persisted.push("subscriptionPlan");
    }

    if (Object.keys(metaUpdates).length > 0) {
      try {
        const { clerkClient } = await import("@clerk/nextjs/server");
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        await client.users.updateUser(userId, {
          publicMetadata: {
            ...(clerkUser.publicMetadata as any),
            ...metaUpdates,
          },
        });
        if (metaUpdates.paymentMethod !== undefined) persisted.push("paymentMethod");
      } catch (e) {
        console.warn("[api/tenant/my-tenant] no se pudo guardar metadata en Clerk", e);
        if (metaUpdates.paymentMethod !== undefined) ignored.push("paymentMethod");
        if (metaUpdates.pendingPlan !== undefined) ignored.push("subscriptionPlan");
      }
    }

    return NextResponse.json({ success: true, persisted, ignored });
  } catch (error: any) {
    console.error("Error updating tenant:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
