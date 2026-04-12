import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Crear cliente Supabase para middleware (usar service role key para operaciones de servidor)
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

export async function middleware(req: NextRequest) {
  // 🔓 MODO DESARROLLO: Autenticación deshabilitada temporalmente
  const DEV_MODE = true;
  
  if (DEV_MODE) {
    // En modo desarrollo, permitir acceso a todas las rutas sin autenticación
    return NextResponse.next();
  }
  
  // Rutas que no necesitan sidebar (públicas)
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/reset-password'];
  
  // Rutas que necesitan sidebar (protegidas)
  const protectedRoutes = ['/dashboard', '/companies', '/settings', '/account/settings', '/reports'];
  
  const { pathname } = req.nextUrl;
  
  // Determinar qué layout usar
  if (pathname.startsWith('/auth/') || publicRoutes.includes(pathname)) {
    // Para rutas de autenticación o públicas, usar layout sin sidebar
    return NextResponse.next();
  }

  // Para rutas protegidas, verificar autenticación
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session && !publicRoutes.includes(pathname) && !pathname.startsWith('/auth/')) {
    // Si no está autenticado y no es ruta pública, redirigir a login
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }
  
  // Para rutas protegidas y autenticadas, obtener el tenant seleccionado
  let selectedTenant = null;
  const selectedTenantCookie = req.cookies.get('selected_tenant');
  
  if (selectedTenantCookie?.value) {
    try {
      selectedTenant = JSON.parse(selectedTenantCookie.value);
    } catch (error) {
      console.error('Error parsing tenant cookie:', error);
    }
  }

  // Crear la respuesta y añadir headers
  const response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // Inyectar headers para Server Components
  if (session?.user) {
    response.headers.set('x-user-id', session.user.id);
  }

  if (selectedTenant?.id) {
    response.headers.set('x-tenant-id', selectedTenant.id);
  }

  // Inyectar headers para Client Components (a través de cookies)
  if (selectedTenant) {
    response.cookies.set('selected_tenant', JSON.stringify(selectedTenant), {
      httpOnly: false, // Permitir acceso desde JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });
  }

  // Para rutas protegidas y autenticadas, usar layout con sidebar
  return response
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
