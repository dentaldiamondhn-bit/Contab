// Stub de @/lib/tenant-resolver para los tests de /api/documents/pdf.
// La ruta real resuelve la empresa contra `companies` (getSupabaseServer), que
// en tests no existe; aqui se devuelve la empresa pedida en `?companyId` y se
// simula el 400 cuando no hay con que determinarla.

import { NextResponse } from 'next/server';

export class ErrorDeEmpresa extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
    this.name = 'ErrorDeEmpresa';
  }
}

export function respuestaDeErrorDeEmpresa(error) {
  if (error instanceof ErrorDeEmpresa) {
    return NextResponse.json({ error: error.message }, { status: error.estado });
  }
  return null;
}

export async function contextoDeEmpresa(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId') || searchParams.get('company_id');
  if (!companyId) {
    const tenant = request.headers.get('x-tenant-id');
    if (!tenant) {
      throw new ErrorDeEmpresa(400, 'No se pudo determinar la empresa de la peticion.');
    }
    return { tenantId: tenant, companyId: null };
  }
  return { tenantId: request.headers.get('x-tenant-id') || companyId, companyId };
}
