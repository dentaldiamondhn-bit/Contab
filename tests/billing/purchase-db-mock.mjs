/**
 * Doble de `@/lib/purchase-db`: las rutas de facturacion solo usan `exigirEmpresa`,
 * que convierte el contexto en `{ tenantId, companyId }` lanzando 400 si no hay
 * empresa real. Se replica aqui (misma semantica que el real, ver
 * `lib/purchase-db.ts`) para no arrastrar el modulo entero con su cliente de
 * Supabase al test de las rutas.
 */
import { ErrorDeEmpresa } from '../../lib/tenant-resolver.ts';

export function exigirEmpresa(contexto) {
  if (!contexto.companyId) {
    throw new ErrorDeEmpresa(
      400,
      'No se pudo determinar la empresa activa. Recarga la pagina o selecciona una empresa.'
    );
  }
  if (!contexto.tenantId) {
    throw new ErrorDeEmpresa(400, 'No se pudo determinar el tenant de la empresa activa.');
  }
  return { tenantId: contexto.tenantId, companyId: contexto.companyId };
}
