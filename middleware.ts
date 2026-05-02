import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Definir rutas públicas (no requieren autenticación)
const isPublicRoute = createRouteMatcher([
  '/auth/login',
  '/auth/register',
  '/auth/reset-password',
  '/auth/callback',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/forgot-password',
  '/onboarding',
  '/api/webhook(.*)',
  '/api/clerk(.*)',
  '/api/dashboard(.*)',
]);

// Definir rutas de admin
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  const { userId, sessionClaims } = await auth();

  // Debug logging
  console.log('Middleware - Request:', {
    pathname,
    hasUserId: !!userId,
    userId,
    sessionClaims: sessionClaims?.metadata,
    userEmail: sessionClaims?.email,
    isAdminRoute: isAdminRoute(req)
  });

  // Si es ruta pública, permitir acceso
  if (isPublicRoute(req)) {
    console.log('Middleware - Public route, allowing access');
    return NextResponse.next();
  }

  // Si no hay usuario autenticado, redirigir a login
  if (!userId) {
    console.log('Middleware - No user found, redirecting to login');
    // Si ya está en login, permitir acceso
    if (pathname === '/auth/login') {
      return NextResponse.next();
    }
    
    const signInUrl = new URL('/auth/login', req.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Si hay usuario autenticado y está en homepage, redirigir a login para verificar onboarding
  if (userId && pathname === '/') {
    console.log('Middleware - Authenticated user on homepage, redirecting to login');
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }


  // Para rutas de admin, verificar rol (metadata del usuario en Clerk)
  // TEMPORARILY DISABLED: sessionClaims.metadata is undefined, so we rely on layout components for authorization
  // if (isAdminRoute(req)) {
  //   const role = (sessionClaims?.metadata as any)?.role;
  //   const email = sessionClaims?.email;
  //   const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
  //
  //   console.log('Middleware - Admin route check:', { pathname, role, email, isSuperAdminEmail });
  //
  //   // Allow access if role matches OR is specific SUPER_ADMIN email
  //   if (!['SUPER_ADMIN', 'SUPPORT', 'ADMIN'].includes(role as string) && !isSuperAdminEmail) {
  //     console.log('Middleware - User not authorized for admin, redirecting to dashboard');
  //     return NextResponse.redirect(new URL('/dashboard', req.url));
  //   }
  //
  //   // Para rutas de creación de tenants, solo SUPER_ADMIN o specific email
  //   const isTenantCreationRoute = createRouteMatcher(['/admin/tenants/create(.*)']);
  //   if (isTenantCreationRoute(req) && role !== 'SUPER_ADMIN' && !isSuperAdminEmail) {
  //     console.log('Middleware - User not SUPER_ADMIN for tenant creation, redirecting');
  //     return NextResponse.redirect(new URL('/admin', req.url));
  //   }
  //
  //   console.log('Middleware - Admin access granted');
  // } else {
  //   console.log('Middleware - Not admin route, continuing');
  // }

  if (isAdminRoute(req)) {
    console.log('Middleware - Admin route detected, allowing access (authorization handled by layout)');
  } else {
    console.log('Middleware - Not admin route, continuing');
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
