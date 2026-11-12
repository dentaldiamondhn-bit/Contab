// Mock de @/lib/tenant-resolver para los tests de rutas de accounting.
// Deriva el tenant del header `x-tenant-id` (o `?tenantId`) sin tocar Clerk/Supabase.
import { NextResponse } from '../diat/next-server-stub.mjs';

export class ErrorDeEmpresa extends Error {
  constructor(message, estado = 400) {
    super(message);
    this.name = 'ErrorDeEmpresa';
    this.estado = estado;
  }
}

export async function contextoDeEmpresa(request) {
  const header = request?.headers?.get?.('x-tenant-id') ?? null;
  let tenantId = header;
  if (!tenantId && request?.url) {
    try {
      tenantId = new URL(request.url).searchParams.get('tenantId');
    } catch {
      tenantId = null;
    }
  }
  if (!tenantId) throw new ErrorDeEmpresa('Tenant ID requerido', 400);
  return { tenantId, companyId: null };
}

export function respuestaDeErrorDeEmpresa(error) {
  if (error instanceof ErrorDeEmpresa) {
    return NextResponse.json({ error: error.message }, { status: error.estado });
  }
  return null;
}
