/**
 * Doble de `@/lib/purchase-db`: la ruta solo usa `exigirEmpresa`, que convierte
 * el contexto en `{ tenantId, companyId }` lanzando 400 si no hay empresa. Se
 * replica aqui para no arrastrar el modulo entero (y su cliente de Supabase) al
 * test de la ruta.
 */
import { mockState } from './diat-generator-mock.mjs';
import { ErrorDeEmpresa } from './tenant-resolver-mock.mjs';

export function exigirEmpresa(contexto) {
  if (!contexto.companyId) {
    throw new ErrorDeEmpresa(400, 'No se pudo determinar la empresa activa.');
  }
  if (!contexto.tenantId) {
    throw new ErrorDeEmpresa(400, 'No se pudo determinar el tenant de la empresa activa.');
  }
  return { tenantId: contexto.tenantId, companyId: contexto.companyId };
}