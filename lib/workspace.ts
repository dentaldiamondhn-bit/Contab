import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";
import { ErrorDeEmpresa, empresaDesde } from "@/lib/tenant-resolver";

/**
 * Contexto de trabajo: que empresa esta activa y, dentro de ella, que sede.
 * Ver AGENTS.md seccion 1b y docs/AISLAMIENTO_EMPRESAS.md.
 *
 * ESTE MODULO REEMPLAZA LA VALIDACION POR TENANT PARA EL CONTEXTO NUEVO.
 *
 * `contextoDeEmpresa` (tenant-resolver.ts) valida que la empresa pedida sea del
 * tenant que viene en `x-tenant-id`, y ese header sale de los claims de Clerk,
 * que son **un solo tenant**. Eso rompe el caso del contador: un contador
 * administra N empresas, que pueden estar en tenants distintos, y la
 * comparacion `empresa.tenant_id === header` lo rechazaria aunque la membresia
 * sea legitima. Al reves, sin el header no hay `companyId` y el filtro cae a
 * tenant-only, que es como se filtraba antes de la 023.
 *
 * Aqui la pertenencia se comprueba contra **`user_company_access`**, que es el
 * dato que de verdad dice a que empresas entra cada usuario. El tenant se
 * DERIVA de la empresa en vez de leerse del header, asi que siempre es
 * consistente con la empresa activa.
 *
 * OJO CON EL MODELO DE CONFIANZA: la cookie `active_company_id` es una PISTA,
 * no una garantia. Cualquiera puede editar sus cookies. Por eso aqui se valida
 * contra la base de datos y no se confia en el valor. Lo mismo con
 * `?companyId`: es la posicion del cliente y solo se usa si el header no existe.
 */

export type RolEspacio = "accountant" | "business_owner";

export type EmpresaDeEspacio = {
  id: string;
  name: string | null;
  rtn: string | null;
  tenant_id: string;
  relationship: "owner" | "accountant" | "viewer";
  is_default: boolean;
};

export type SedeDeEspacio = {
  id: string;
  code: string;
  name: string;
  is_default: boolean;
};

export type ContextoEspacio = {
  userId: string;
  companyId: string;
  tenantId: string;
  /** Rol EN ESTA empresa. No es un atributo del usuario: ver rolDeEmpresa(). */
  role: RolEspacio;
  /** El usuario administra 2+ empresas. El flujo del contador aplica. */
  multiEmpresa: boolean;
  relationship: "owner" | "accountant" | "viewer";
  /** 'ALL' solo tiene sentido para el empresario. Para el contador es su sede. */
  locationId: string | null;
  locations: SedeDeEspacio[];
};

/** `User.id` (uuid de la app) a partir del id de Clerk (`user_2xxx`), por `authid`. */
export async function usuarioAppId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const supabase = getSupabaseServer() as any;
  // OJO: `authid` NO tiene indice unico (solo `idx_user_authid`, no unico), asi
  // que dos filas de `User` pueden compartir la misma identidad de Clerk. Con
  // `.maybeSingle()` eso lanza `PGRST116` (2+ filas) y el usuario se quedaba sin
  // resolver, sin pista del motivo. Se toma la primera de forma determinista.
  const { data } = await supabase
    .from("User")
    .select("id")
    .eq("authid", userId)
    .order("id", { ascending: true })
    .limit(1);
  const fila = Array.isArray(data) ? data[0] : data;
  return fila?.id ? String(fila.id) : null;
}

/**
 * Empresas a las que tiene acceso el usuario, segun `user_company_access`.
 *
 * `viewer` se queda fuera a proposito: no es un rol de los dos flujos del
 * onboarding y concederia lectura de contabilidad. Si hace falta, es una
 * decision de producto, no un default.
 */
export async function empresasDelUsuario(userId: string): Promise<EmpresaDeEspacio[]> {
  const supabase = getSupabaseServer() as any;
  const { data, error } = await supabase
    .from("user_company_access")
    .select("company_id, relationship, is_default, companies(id, name, rtn, tenant_id)")
    .eq("user_id", userId)
    .in("relationship", ["owner", "accountant"]);

  if (error || !Array.isArray(data)) return [];

  const planas = data
    .map((r: any) => {
      const c = Array.isArray(r.companies) ? r.companies[0] : r.companies;
      if (!c) return null;
      return {
        id: String(c.id),
        name: c.name ?? null,
        rtn: c.rtn ?? null,
        tenant_id: String(c.tenant_id),
        relationship: r.relationship,
        is_default: Boolean(r.is_default),
      } as EmpresaDeEspacio;
    })
    .filter(Boolean) as EmpresaDeEspacio[];

  // La de por defecto primero, luego alfabético: el selector no debe cambiar de
  // orden entre recargas.
  return planas.sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    return (a.name || "").localeCompare(b.name || "");
  });
}

/**
 * El rol se deriva POR EMPRESA, no del usuario entero.
 *
 * Una misma persona puede ser empresario de su propia empresa y contador de las
 * de sus clientes, y en los datos ya ocurre: `azuna22@outlook.com` tiene
 * `relationship='owner'` de Empresa TEST185 y `relationship='accountant'` de
 * test 1 y test 2.
 *
 * Si el rol se sacara del conteo global ("si tiene mas de una empresa, es
 * contador"), a esa persona se le negaria la vista consolidada de SU propia
 * empresa, que si le corresponde. Por eso:
 *   - `rol` es el de la empresa ACTIVA, segun su `relationship`.
 *   - `multiEmpresa` es un dato aparte: si tiene 2+ empresas, el flujo del
 *     contador aplica, pero eso no le quita ser empresario de la suya.
 */
export function rolDeEmpresa(empresa: EmpresaDeEspacio): RolEspacio {
  return empresa.relationship === "owner" ? "business_owner" : "accountant";
}

/** Cuantas empresas administra en total. 2+ significa que el flujo contador aplica. */
export function esMultiEmpresa(empresas: EmpresaDeEspacio[]): boolean {
  return empresas.length > 1;
}

export async function ubicacionesDeEmpresa(companyId: string): Promise<SedeDeEspacio[]> {
  const supabase = getSupabaseServer() as any;
  const { data } = await supabase
    .from("company_location")
    .select("id, code, name, is_default")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });
  if (!Array.isArray(data)) return [];
  return data.map((d: any) => ({
    id: String(d.id),
    code: String(d.code),
    name: String(d.name),
    is_default: Boolean(d.is_default),
  }));
}

/** El header que pone middleware.ts desde la cookie. */
export function empresaDeHeader(request: NextRequest | Request): string | null {
  return request.headers.get("x-company-id");
}

export function sedeDeHeader(request: NextRequest | Request): string | null {
  return request.headers.get("x-location-id");
}

/**
 * Contexto completo de la peticion, con pertenencia comprobada en la BD.
 *
 * Lanza 401 sin sesion, 403 si la empresa no esta en su membresia y 400 si no se
 * puede determinar. Nunca cae a una empresa por defecto: antes de la 023 ese
 * fallback era "la empresa 1", que es como se filtraba contabilidad ajena.
 */
export async function contextoDeEspacio(
  request: NextRequest | Request,
  opciones: { companyIdDeRuta?: string } = {}
): Promise<ContextoEspacio> {
  const userId = await usuarioAppId();
  if (!userId) throw new ErrorDeEmpresa(401, "Sin sesión.");

  const empresas = await empresasDelUsuario(userId);
  if (empresas.length === 0) {
    throw new ErrorDeEmpresa(403, "Tu usuario no tiene ninguna empresa asignada.");
  }

  const { searchParams } = new URL(request.url);
  // El header va antes que la query por el mismo motivo de siempre: `?companyId`
  // lo manda el cliente. Aun asi ninguno de los dos se acepta sin validar.
  const pedido =
    opciones.companyIdDeRuta ||
    empresaDeHeader(request) ||
    searchParams.get("companyId") ||
    searchParams.get("company_id");

  const permitida = pedido ? empresas.find((e) => e.id === pedido) : undefined;
  if (pedido && !permitida) {
    throw new ErrorDeEmpresa(403, "Esa empresa no está entre las tuyas.");
  }
  // Sin empresa explicita: la de por defecto, y solo si es una sola. Con varias,
  // elegir por el usuario es lo correcto: adivinar seria mostrarle la
  // contabilidad de la empresa equivocada.
  const activa = permitida ?? (empresas.length === 1 ? empresas[0] : null);
  if (!activa) {
    throw new ErrorDeEmpresa(400, "Elige qué empresa quieres administrar.");
  }

  const locations = await ubicacionesDeEmpresa(activa.id);
  // El rol es el de ESTA empresa. `multiEmpresa` va aparte porque son cosas
  // distintas: se puede ser.multiEmpresa y a la vez empresario de la suya.
  const role = rolDeEmpresa(activa);
  const multiEmpresa = esMultiEmpresa(empresas);
  const sedePedida = sedeDeHeader(request) || searchParams.get("locationId");

  // 'ALL' (consolidado) solo existe para quien es dueño de la empresa activa. Un
  // contador que administra la empresa de otro no puede consolidar sus sedes.
  const locationId = sedePedida && locations.some((l) => l.id === sedePedida) ? sedePedida : null;

  return {
    userId,
    companyId: activa.id,
    // Derivado de la empresa, no del header: asi el tenant nunca discrepa de la
    // empresa activa, que es justo el bug que hacia que company_id y tenant_id
    // apuntaran a cosas distintas.
    tenantId: activa.tenant_id,
    role,
    multiEmpresa,
    relationship: activa.relationship,
    locationId,
    locations,
  };
}

/**
 * Filtro de sede para las consultas.
 *
 * Devuelve `{}` en consolidated para que la consulta NO filtre, y
 * `{ location_id }` para una sede concreta. Nunca devuelve algo que fuerce una
 * sede: `location_id = null` significa "a nivel de empresa" y en Supabase
 * eso se filtra con `.is("location_id", null)`, no con `.eq(..., null)`.
 */
export function filtroSede(ctx: ContextoEspacio, consolidada: boolean): Record<string, unknown> {
  if (consolidada && ctx.role === "business_owner") return {};
  if (ctx.locationId) return { location_id: ctx.locationId };
  return {};
}
