// ============================================================================
// CONTAB - Middleware de Autorización Centralizado
// ============================================================================
// Uso: Llamar checkAuth(req, requiredPermissions) en cada API route
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Role, Permission, hasPermission, hasAnyPermission, VALID_ROLES } from './permissions';

export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  tenantId?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

// Extraer el rol del usuario desde Clerk metadata
function extractRole(metadata: Record<string, unknown> | undefined): Role {
  if (!metadata) return 'USER';
  const role = (metadata.role as string)?.toUpperCase();
  if (VALID_ROLES.includes(role as Role)) return role as Role;
  return 'USER';
}

// Obtener el usuario autenticado
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !sessionClaims) return null;

    const metadata = sessionClaims.metadata as Record<string, unknown> | undefined;
    const email = (sessionClaims.email as string) || '';
    const role = extractRole(metadata);
    const tenantId = metadata?.tenantId as string | undefined;

    return { userId, email, role, tenantId };
  } catch {
    return null;
  }
}

// Verificar autenticación + permisos
export async function checkAuth(
  req: NextRequest,
  options?: {
    requiredPermissions?: Permission[];
    requireAll?: boolean; // true = TODOS los permisos, false = ALGUNO
    allowedRoles?: Role[];
  }
): Promise<AuthResult> {
  const user = await getAuthUser(req);

  if (!user) {
    return { success: false, error: 'No autenticado' };
  }

  // Verificar roles permitidos
  if (options?.allowedRoles && options.allowedRoles.length > 0) {
    if (!options.allowedRoles.includes(user.role)) {
      return { success: false, error: `Rol '${user.role}' no tiene acceso` };
    }
  }

  // Verificar permisos requeridos
  if (options?.requiredPermissions && options.requiredPermissions.length > 0) {
    const hasAccess = options.requireAll
      ? hasAnyPermission(user.role, options.requiredPermissions) // requireAll se maneja como "any" para SUPER_ADMIN
      : hasAnyPermission(user.role, options.requiredPermissions);

    if (!hasAccess && user.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Sin permisos suficientes' };
    }
  }

  return { success: true, user };
}

// Helper para respuestas de error de autorización
export function unauthorizedResponse(message: string = 'No autorizado'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function unauthenticatedResponse(): NextResponse {
  return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
}

// Wrapper para API routes con autorización
export function withAuth(
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>,
  options?: {
    requiredPermissions?: Permission[];
    allowedRoles?: Role[];
    method?: string;
  }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const result = await checkAuth(req, options);

    if (!result.success) {
      return result.error === 'No autenticado'
        ? unauthenticatedResponse()
        : unauthorizedResponse(result.error);
    }

    return handler(req, result.user!);
  };
}
