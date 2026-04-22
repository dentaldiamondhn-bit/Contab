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

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  const { userId, sessionClaims } = await auth();

  // Si es ruta pública, permitir acceso
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Si no hay usuario autenticado y no es ruta pública, redirigir a sign-in
  if (!userId) {
    const signInUrl = new URL('/auth/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Para rutas de admin, verificar rol (metadata del usuario en Clerk)
  if (isAdminRoute(req)) {
    const role = sessionClaims?.metadata?.role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(role as string)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Obtener tenant seleccionado de la cookie
  let selectedTenant = null;
  const selectedTenantCookie = req.cookies.get('selected_tenant');

  if (selectedTenantCookie?.value) {
    try {
      selectedTenant = JSON.parse(selectedTenantCookie.value);
    } catch (error) {
      console.error('Error parsing tenant cookie:', error);
    }
  }

  // Crear respuesta con headers
  const response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // Inyectar headers para Server Components
  if (userId) {
    response.headers.set('x-user-id', userId);
    response.headers.set('x-user-email', sessionClaims?.email as string || '');
  }

  if (selectedTenant?.id) {
    response.headers.set('x-tenant-id', selectedTenant.id);
    response.headers.set('x-tenant-name', selectedTenant.businessName || '');
  }

  // Refrescar cookie de tenant
  if (selectedTenant) {
    response.cookies.set('selected_tenant', JSON.stringify(selectedTenant), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
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
