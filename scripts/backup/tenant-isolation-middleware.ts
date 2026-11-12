// Middleware actualizado para soportar aislamiento de tenants con códigos únicos
// Reemplazar o actualizar el contenido de middleware.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Definir rutas públicas (no requieren autenticación)
const isPublicRoute = createRouteMatcher([
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/reset-password',
  '/auth/callback',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/forgot-password',
  '/api/webhook(.*)',
  '/api/clerk(.*)',
]);

// Definir rutas de admin
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
]);

// Definir rutas que requieren aislamiento de tenant
const isTenantIsolatedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/inventory(.*)',
  '/accounting(.*)',
  '/reports(.*)',
  '/settings(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  const { userId, sessionClaims } = await auth();

  // Si es ruta pública, permitir acceso
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Si no hay usuario autenticado y no es ruta pública, redirigir a login
  if (!userId) {
    const signInUrl = new URL('/auth/login', req.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Extraer metadata del usuario
  const metadata = sessionClaims?.metadata as any;
  const userRole = metadata?.role || 'USER';
  const userTenantId = metadata?.tenantId;
  const userTenantCode = metadata?.tenantCode;
  const isIsolated = metadata?.isolation?.tenantScope || false;

  // Para rutas de admin, verificar rol
  if (isAdminRoute(req)) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Si es ADMIN, verificar que tenga tenant asignado
    if (userRole === 'ADMIN' && !userTenantId) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  // Verificar aislamiento de tenant para rutas aisladas
  if (isTenantIsolatedRoute(req) && isIsolated) {
    // Obtener tenant seleccionado de la cookie
    const selectedTenantCookie = req.cookies.get('selected_tenant');
    let selectedTenant = null;

    if (selectedTenantCookie?.value) {
      try {
        selectedTenant = JSON.parse(selectedTenantCookie.value);
      } catch (error) {
        console.error('Error parsing tenant cookie:', error);
      }
    }

    // Si no hay tenant seleccionado y el usuario tiene uno, usar el del usuario
    if (!selectedTenant && userTenantId) {
      selectedTenant = {
        id: userTenantId,
        businessName: '', // Se llenará desde la BD
        tenantCode: userTenantCode || ''
      };
    }

    // Verificar que el usuario solo acceda a su tenant
    if (selectedTenant && selectedTenant.id !== userTenantId) {
      console.warn(`Acceso cruzado detectado: Usuario ${userId} intentando acceder a tenant ${selectedTenant.id} pero pertenece a ${userTenantId}`);
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Si el usuario no tiene tenant asignado pero la ruta lo requiere
    if (!userTenantId && userRole !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }
  }

  // Crear respuesta con headers de aislamiento
  const response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // Inyectar headers para Server Components con información de aislamiento
  if (userId) {
    response.headers.set('x-user-id', userId);
    response.headers.set('x-user-email', sessionClaims?.email as string || '');
    response.headers.set('x-user-role', userRole);
  }

  if (userTenantId) {
    response.headers.set('x-tenant-id', userTenantId);
    response.headers.set('x-tenant-code', userTenantCode || '');
    response.headers.set('x-is-isolated', isIsolated.toString());
  }

  // Refrescar cookie de tenant si existe
  if (userTenantId && userTenantCode) {
    const tenantData = {
      id: userTenantId,
      businessName: '', // Se puede obtener de la BD si es necesario
      tenantCode: userTenantCode
    };

    response.cookies.set('selected_tenant', JSON.stringify(tenantData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });
  }

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

// Helper functions para componentes
export function getTenantIsolationHeaders(headers: Headers) {
  return {
    userId: headers.get('x-user-id'),
    userEmail: headers.get('x-user-email'),
    userRole: headers.get('x-user-role'),
    tenantId: headers.get('x-tenant-id'),
    tenantCode: headers.get('x-tenant-code'),
    isIsolated: headers.get('x-is-isolated') === 'true'
  };
}

// Validación de permisos para roles aislados
export function hasTenantPermission(
  userRole: string,
  userTenantId: string,
  targetTenantId: string,
  requiredPermission: string
): boolean {
  // SUPER_ADMIN puede acceder a todo
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }

  // Verificar que pertenezca al mismo tenant
  if (userTenantId !== targetTenantId) {
    return false;
  }

  // Verificar permisos según rol
  const rolePermissions = {
    'ADMIN': [
      'tenant:admin',
      'users:tenant_manage',
      'inventory:manage',
      'accounting:manage',
      'reports:tenant'
    ],
    'MANAGER': [
      'inventory:view',
      'inventory:create',
      'inventory:edit',
      'accounting:view',
      'accounting:create',
      'reports:basic'
    ],
    'USER': [
      'inventory:view',
      'accounting:view',
      'reports:personal'
    ],
    'VIEWER': [
      'inventory:readonly',
      'accounting:readonly',
      'reports:view'
    ]
  };

  const permissions = rolePermissions[userRole as keyof typeof rolePermissions] || [];
  return permissions.includes(requiredPermission);
}
