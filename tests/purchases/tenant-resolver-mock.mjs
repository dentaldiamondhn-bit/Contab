/**
 * Doble de `@/lib/tenant-resolver` para `tests/purchases`.
 *
 * `ErrorDeEmpresa` replica la firma REAL `(estado, mensaje)` (el de accounting
 * la tiene invertida; por eso no se reusa).
 *
 * `contextoDeEmpresa` deriva la empresa de los headers `x-company-id` /
 * `x-tenant-id`, que es lo que pone `middleware.ts` en producción. `respuestaDe
 * ErrorDeEmpresa` devuelve el mismo contrato que el real (status + json) para
 * poder probar que las rutas traducen el 400/403 y no lo convierten en 500.
 */
import { NextResponse } from '../diat/next-server-stub.mjs';

export class ErrorDeEmpresa extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.name = 'ErrorDeEmpresa';
    this.estado = estado;
  }
}

export async function contextoDeEmpresa(request) {
  const cabecera = (nombre) => request?.headers?.get?.(nombre) ?? null;
  const companyId = cabecera('x-company-id');
  const tenantId = cabecera('x-tenant-id');
  if (!companyId || !tenantId) {
    throw new ErrorDeEmpresa(400, 'No se pudo determinar la empresa de la peticion.');
  }
  return { tenantId, companyId };
}

export function respuestaDeErrorDeEmpresa(error) {
  if (error instanceof ErrorDeEmpresa) {
    return NextResponse.json({ error: error.message }, { status: error.estado });
  }
  return null;
}