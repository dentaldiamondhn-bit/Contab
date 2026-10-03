import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

/**
 * Resolucion de tenant Y empresa. Ver AGENTS.md seccion 1.
 *
 * Este modulo existe porque `resolveTenant` estaba duplicado en 14 rutas, con dos
 * variantes distintas, y ninguna traducía el `companies.id` de la URL al
 * `tenant_id` que usan las tablas de negocio.
 *
 * Un `Tenant` puede tener VARIAS empresas (TEST1DS tiene "test 1" y "test 2" con
 * RTN propio), asi que aislar solo por `tenant_id` hace que esas empresas
 * compartan inventario y libro contable. El isolation key real es `company_id`;
 * `tenant_id` sirve para agrupar, no para separar.
 */

/**
 * Las tablas de negocio guardan el **Tenant.id** ("ANGELOH7", "TEST1DS", "1") en
 * `tenant_id` / `tenantId`. Las pantallas viven en `/companies/[id]/...` donde
 * `[id]` es **companies.id**, que para 7 de 8 empresas es un UUID distinto. Usar
 * el uno por el otro devuelve cero filas.
 *
 * Busca por `tenant_id` primero (por si ya viene el codigo) y despues por `id`.
 */
export async function tenantFromCompanyId(companyId: string): Promise<string | null> {
  const id = String(companyId || "").trim();
  if (!id) return null;
  const supabase = getSupabaseServer() as any;

  const byTenant = await supabase
    .from("companies")
    .select("tenant_id")
    .eq("tenant_id", id)
    .limit(1)
    .maybeSingle();
  if (!byTenant.error && byTenant.data?.tenant_id) return String(byTenant.data.tenant_id);

  const byId = await supabase
    .from("companies")
    .select("tenant_id")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  if (!byId.error && byId.data?.tenant_id) return String(byId.data.tenant_id);

  // No hay fila en `companies`: puede ser un tenant sin company (util en scripts).
  return id;
}

/** Tenant de la sesion. Lo inyecta middleware.ts; es el unico dato confiable. */
export function sessionTenant(request: NextRequest | Request): string | null {
  return request.headers.get("x-tenant-id");
}

/**
 * Tenant efectivo de la peticion.
 *
 * Orden: el `[id]` de la ruta (si la pagina es de una empresa concreta) -> el
 * header de sesion -> `?companyId=` traducido -> `?tenantId=`.
 *
 * El header va por delante de la query **a proposito**: `?companyId` lo manda el
 * cliente y antes ganaba al header, de modo que cualquier usuario autenticado
 * podia pedir los datos de otra empresa con `?companyId=ANGELOH7`.
 *
 * OJO: esto NO comprueba pertenencia. Si el header falta y la peticion trae un
 * tenant en la query, se acepta; para eso hace falta validar contra la sesion
 * (ver `assertTenantAccess`). Un `User` tiene un unico `tenantId`, asi que de
 * momento el header siempre deberia existir.
 */
export async function resolveTenant(
  request: NextRequest,
  opciones: { companyIdDeRuta?: string } = {}
): Promise<string | null> {
  const { searchParams } = new URL(request.url);

  if (opciones.companyIdDeRuta) {
    return tenantFromCompanyId(opciones.companyIdDeRuta);
  }

  const deSesion = sessionTenant(request);
  if (deSesion) return deSesion;

  const companyId = searchParams.get("companyId");
  if (companyId) return tenantFromCompanyId(companyId);

  return searchParams.get("tenantId");
}

// =============================================================================
// Aislamiento por EMPRESA
// =============================================================================

/** Contexto de la peticion: a que tenant y a que empresa pertenece. */
export type ContextoEmpresa = {
  /** Tenant de sesion. Es el que va en `tenant_id`. */
  tenantId: string | null;
  /** `companies.id`. Es el que va en `company_id`. El aislamiento real. */
  companyId: string | null;
};

/** Error de contexto: 401 sin sesión, 400 si no se puede deducir, 403 si no le pertenece. */
export class ErrorDeEmpresa extends Error {
  readonly estado: 400 | 401 | 403;
  constructor(estado: 400 | 401 | 403, mensaje: string) {
    super(mensaje);
    this.estado = estado;
    this.name = "ErrorDeEmpresa";
  }
}

/**
 * Convierte un `ErrorDeEmpresa` en la respuesta HTTP correcta, o devuelve `null`
 * si el error es de otro tipo.
 *
 * Para las rutas que prefieren su propio `try/catch` en vez de `withEmpresa`:
 * sin esto, un 403 ("esa empresa no es tuya") se devolvía como **500**, o sea que
 * un problema de permisos parecía un fallo del servidor.
 *
 *   } catch (error: any) {
 *     const respuesta = respuestaDeErrorDeEmpresa(error);
 *     if (respuesta) return respuesta;
 *     return NextResponse.json({ error: error.message }, { status: 500 });
 *   }
 */
export function respuestaDeErrorDeEmpresa(error: unknown): NextResponse | null {
  if (error instanceof ErrorDeEmpresa) {
    return NextResponse.json({ error: error.message }, { status: error.estado });
  }
  return null;
}

export type Empresa = { id: string; tenant_id: string; name: string | null };

/**
 * Resuelve un identificador a una fila de `companies`.
 *
 * Acepta las dos convenciones que circulan en el proyecto: el UUID de
 * `companies.id` (el `[id]` de la URL) y el codigo del tenant (que es lo que
 * tienen guardado algunos `company_id` viejos, ej. "ANGELOH7").
 *
 * Si el codigo corresponde a un tenant con varias empresas, devuelve **la mas
 * antigua** (`created_at`), que es la misma regla que usa la migracion 023.
 */
export async function empresaDesde(id: string): Promise<Empresa | null> {
  const limpio = String(id || "").trim();
  if (!limpio) return null;
  const supabase = getSupabaseServer() as any;

  const porId = await supabase
    .from("companies")
    .select("id, tenant_id, name, created_at")
    .eq("id", limpio)
    .limit(1)
    .maybeSingle();
  if (!porId.error && porId.data) {
    return { id: String(porId.data.id), tenant_id: String(porId.data.tenant_id), name: porId.data.name };
  }

  const porCodigo = await supabase
    .from("companies")
    .select("id, tenant_id, name, created_at")
    .eq("tenant_id", limpio)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!porCodigo.error && porCodigo.data) {
    return { id: String(porCodigo.data.id), tenant_id: String(porCodigo.data.tenant_id), name: porCodigo.data.name };
  }

  return null;
}

/**
 * Contexto de empresa de la peticion, con **comprobacion de pertenencia**.
 *
 * A diferencia de `resolveTenant`, esto silan: si la peticion pide una empresa y
 * esa empresa no es del tenant de la sesion, lanza 403. Ese era el agujero que
 * permitia a un usuario autenticado leer y escribir datos de otra empresa.
 *
 * Orden: `[id]` de la ruta -> `?companyId` -> header `x-company-id` (empresa
 * activa de la cookie) -> solo tenant.
 *
 * El header **valida**: no se fia de la query ni de la cookie. Si la empresa
 * existe pero no es del tenant de la sesion, 403.
 *
 * Sin header de sesion (scripts, jobs) no hay con que validar, asi que se
 * permite. En una peticion de navegador el header siempre deberia existir
 * (lo pone `middleware.ts`), asi que ese camino es el excepcional.
 */
export async function contextoDeEmpresa(
  request: NextRequest | Request,
  opciones: { companyIdDeRuta?: string } = {}
): Promise<ContextoEmpresa> {
  const { searchParams } = new URL(request.url);
  const deSesion = sessionTenant(request);
  const pedido = opciones.companyIdDeRuta || searchParams.get("companyId") || searchParams.get("company_id");

  if (pedido) {
    const empresa = await empresaDesde(pedido);
    if (!empresa) {
      if (deSesion) {
        throw new ErrorDeEmpresa(403, "La empresa solicitada no existe.");
      }
      // Sin sesion no hay contra quien validar (scripts). Se usa el valor crudo.
      return { tenantId: pedido, companyId: null };
    }
    if (deSesion && empresa.tenant_id !== deSesion) {
      throw new ErrorDeEmpresa(403, "Esa empresa no pertenece a tu cuenta.");
    }
    return { tenantId: deSesion ?? empresa.tenant_id, companyId: empresa.id };
  }

  // Empresa activa de la cookie, que `middleware.ts` ya reenvia como
  // `x-company-id`. Se consultaba solo como ultimo paso ANTES de caer a
  // tenant-only, y por eso casi nunca se llegaba: las rutas de inventario
  // (`/api/inventory/*`) no viven bajo `/companies/[id]/...` y el cliente les
  // mandaba `?tenantId=`, que aqui no se lee. Resultado: `companyId` volvia
  // null y `filtroEmpresaOCompany` caia a `{ tenant_id }`, o sea que test 1 y
  // test 2 (que comparten `TEST1DS`) veian el inventario la una de la otra.
  //
  // Se valida con la MISMA regla que `?companyId`: si existe y no es del tenant
  // de la sesion, 403. La unica diferencia es que si el valor NO resuelve a
  // ninguna fila de `companies` (cookie vieja de una empresa borrada) se
  // ignora en vez de devolver 403, para no dejar la app entera sin datos por
  // una cookie caducada. No hay fuga posible: no hay empresa que autorizar.
  const deCabecera = request.headers.get("x-company-id");
  if (deCabecera) {
    const empresa = await empresaDesde(deCabecera);
    if (empresa) {
      if (deSesion && empresa.tenant_id !== deSesion) {
        throw new ErrorDeEmpresa(403, "Esa empresa no pertenece a tu cuenta.");
      }
      return { tenantId: deSesion ?? empresa.tenant_id, companyId: empresa.id };
    }
  }

  const tenantId = deSesion || (await tenantFromCompanyId(searchParams.get("tenantId") || ""));
  if (!tenantId) {
    throw new ErrorDeEmpresa(400, "No se pudo determinar la empresa de la peticion.");
  }
  return { tenantId, companyId: null };
}

/**
 * Wrapper para rutas `/companies/[id]/...`: resuelve el contexto una vez, lo pasa
 * al handler y convierte `ErrorDeEmpresa` en la respuesta HTTP correcta.
 *
 *   export const GET = withEmpresa(async (request, ctx, empresa) => {
 *     const { companyId, tenantId } = empresa;
 *     ...
 *   });
 */
export function withEmpresa<Ctx extends { params: Promise<Record<string, string>> }>(
  handler: (
    request: NextRequest,
    ctx: Ctx,
    empresa: ContextoEmpresa
  ) => Promise<Response> | Response
) {
  return async (request: NextRequest, ctx: Ctx): Promise<Response> => {
    try {
      const params = (await ctx.params) as Record<string, string>;
      const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: params?.id });
      return await handler(request, ctx, empresa);
    } catch (e) {
      if (e instanceof ErrorDeEmpresa) {
        return NextResponse.json({ error: e.message }, { status: e.estado });
      }
      throw e;
    }
  };
}
