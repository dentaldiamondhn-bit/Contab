import type { ContextoEmpresa } from "./tenant-resolver";

/**
 * Filtro de aislamiento por empresa. Ver AGENTS.md seccion 1.
 *
 * Un `Tenant` puede tener varias empresas (TEST1DS tiene "test 1" y "test 2" con
 * RTN propio). Filtrar solo por `tenant_id` hacia que compartieran inventario y
 * libro contable, asi que el filtro real es `company_id`.
 *
 * Como `contextoDeEmpresa` ya valido que la empresa pertenece al tenant de la
 * sesion, `company_id` + `tenant_id` siempre son coherentes: se pueden usar los
 * dos. Por eso aqui se **anaden** en vez de sustituir al filtro de tenant, que es
 * lo que menos rompe.
 *
 * La migracion 023 rellena company_id en lo historico y pone un trigger para las
 * filas nuevas, asi que el INSERT no necesita tocar nada.
 */

/** Tablas que ya tienen `company_id` (medido, ver migracion 023). */
export const TABLAS_CON_EMPRESA = [
  "product",
  "Invoice",
  "InvoiceItem",
  "cai",
  "warehouse",
  "Account",
  "Transaction",
  "JournalEntry",
  "Purchase",
  "talonarios",
  "bankaccount",
  "customer",
  "inventory_movement",
  "File",
  "paymentlink",
] as const;

/**
 * Filtro de empresa para una consulta. Devuelve `{ company_id }`, o lanza si el
 * contexto no trae empresa.
 *
 * Lanza a proposito: si una ruta pide empresa y no la tiene, es un bug de la
 * ruta (se le olvido `contextoDeEmpresa`), y devolver un filtro por tenant
 * destruiria el aislamiento en silencio. Es preferible un 500 con este mensaje a
 * una pantalla que muestra los datos de la empresa hermana.
 */
export function filtroEmpresa(empresa: ContextoEmpresa): { company_id: string } {
  if (!empresa.companyId) {
    throw new Error(
      "Se pidio company_id pero el contexto no tiene empresa. " +
        "Migrar esta ruta de resolveTenant() a contextoDeEmpresa()."
    );
  }
  return { company_id: empresa.companyId };
}

/**
 * Igual que `filtroEmpresa`, pero si la ruta todavia no resuelve empresa devuelve
 * `{ tenant_id }` para que siga funcionando. **Solo para migrar paso a paso**:
 * mientras se use, esa ruta sigue mostrando los datos de las empresas hermanas
 * del mismo tenant.
 */
export function filtroEmpresaOCompany(
  empresa: ContextoEmpresa
): { company_id: string } | { tenant_id: string } {
  return empresa.companyId
    ? { company_id: empresa.companyId }
    : { tenant_id: empresa.tenantId ?? "" };
}

/** ¿Esta ruta a migrating a empresa, o sigue en modo compatibility? */
export function usaEmpresa(empresa: ContextoEmpresa): boolean {
  return Boolean(empresa.companyId);
}
