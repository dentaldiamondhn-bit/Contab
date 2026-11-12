import { NextRequest } from "next/server";

// Helper para obtener tenant information del request
export async function getTenantFromRequest(request: NextRequest) {
  // Prioridad: Headers > Query Params > Default
  let tenantId = request.headers.get("x-tenant-id");
  
  if (!tenantId) {
    const url = new URL(request.url);
    tenantId = url.searchParams.get("tenantId");
  }
  
  if (!tenantId) {
    return null;
  }

  return { id: tenantId };
}

// Helper para validar que un usuario tiene acceso a un tenant
export async function validateTenantAccess(userId: string, tenantId: string): Promise<boolean> {
  // Aquí iría la lógica para validar que el usuario pertenece al tenant
  // Por ahora, retornamos true para desarrollo
  return true;
}

// Helper para agregar tenantId a los headers de las llamadas API
export function addTenantToHeaders(tenantId: string): HeadersInit {
  return {
    'x-tenant-id': tenantId,
  };
}
