import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// ============================================================================
// CONTAB - Middleware de Protección de Rutas
// ============================================================================

// Rutas públicas (no requieren autenticación)
const publicRoutes = createRouteMatcher([
  '/',
  '/auth/login',
  '/auth/sign-up',
  '/auth/sso-callback',
  '/api/webhooks/clerk',
  '/api/health',
]);

// Rutas de API públicas
const publicApiRoutes = createRouteMatcher([
  '/api/webhooks(.*)',
  '/api/health(.*)',
  '/api/tenants-api(.*)',
  '/api/companies(.*)',
]);

// Rutas de admin (solo SUPER_ADMIN y SUPPORT)
const adminRoutes = createRouteMatcher([
  '/admin(.*)',
]);

// Rutas de soporte (solo SUPPORT)
const supportRoutes = createRouteMatcher([
  '/support(.*)',
]);

// Rutas de tenant admin (ADMIN, MANAGER, SUPER_ADMIN)
const tenantAdminRoutes = createRouteMatcher([
  '/tenant-admin(.*)',
]);

// Nivel de acceso por rol
const ROLE_LEVELS: Record<string, number> = {
  SUPER_ADMIN: 100,
  SUPPORT: 80,
  ADMIN: 60,
  MANAGER: 50,
  ACCOUNTANT: 40,
  USER: 20,
  VIEWER: 10,
};

function getRoleLevel(role: string | undefined): number {
  return ROLE_LEVELS[role || ''] || 0;
}

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Permitir rutas públicas sin autenticación
  if (publicRoutes(req) || publicApiRoutes(req)) {
    return;
  }

  // Si no hay usuario, redirigir a login
  if (!userId) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('redirect_url', req.url);
    return Response.redirect(loginUrl);
  }

  // Extraer rol del usuario desde sessionClaims
  const userRole = (sessionClaims?.publicMetadata as Record<string, unknown>)?.role as string || 'VIEWER';
  const roleLevel = getRoleLevel(userRole);

  // Verificar rutas de admin (solo SUPER_ADMIN y SUPPORT)
  if (adminRoutes(req)) {
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'SUPPORT') {
      return Response.redirect(new URL('/dashboard', req.url));
    }
  }

  // Verificar rutas de soporte (solo SUPPORT)
  if (supportRoutes(req)) {
    if (userRole !== 'SUPPORT') {
      return Response.redirect(new URL('/dashboard', req.url));
    }
  }

  // Verificar rutas de tenant admin (ADMIN, MANAGER, SUPER_ADMIN)
  if (tenantAdminRoutes(req)) {
    if (roleLevel < 50) {
      return Response.redirect(new URL('/dashboard', req.url));
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/api/(trpc)(.*)',
  ],
};
