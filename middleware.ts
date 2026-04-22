import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Crear cliente Supabase para middleware
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Configuración de rutas
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/auth/reset-password', '/auth/callback'];
const PROTECTED_ROUTES = [
  '/dashboard', '/companies', '/settings', '/account', 
  '/reports', '/transactions', '/admin', '/multi-currency',
  '/import-export', '/tax-reporting', '/closing', '/bank-accounts',
  '/cai', '/isv', '/withholding', '/payment', '/patient-billing',
  '/onboarding', '/setup'
];
const ADMIN_ROUTES = ['/admin'];

// Rutas que no requieren autenticación (estáticas, API públicas)
const EXCLUDED_PATHS = [
  '/_next', '/api/auth', '/api/webhook', '/static', 
  '/favicon.ico', '/robots.txt', '/sitemap.xml'
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Verificar si la ruta está excluida
  if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // Verificar autenticación para todas las rutas excepto públicas
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  const isAdminRoute = ADMIN_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  // Obtener sesión
  const { data: { session } } = await supabase.auth.getSession();
  
  // Si es ruta pública, permitir acceso sin verificar autenticación
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Si no hay sesión y es ruta protegida, redirigir a login
  if (!session && (isProtectedRoute || isAdminRoute)) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Para rutas de administración, verificar rol
  if (isAdminRoute && session?.user?.id) {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('authId', session.user.id)
      .single();
    
    if (userError || !userData) {
      console.error('Error fetching user role:', userError);
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
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
  if (session?.user) {
    response.headers.set('x-user-id', session.user.id);
    response.headers.set('x-user-email', session.user.email || '');
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
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
