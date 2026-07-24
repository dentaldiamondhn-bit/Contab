import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

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
);

// Definimos qué rutas son públicas (no requieren login)
const isPublicRoute = createRouteMatcher([
  "/auth/login(.*)",
  "/auth/sign-in(.*)",
  "/auth/sign-up(.*)",
  "/api/webhooks(.*)",
  "/", // Landing page
]);

// Definimos rutas que requieren rol de administrador
const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const { pathname } = req.nextUrl;
  const isProduction = process.env.NODE_ENV === 'production';

  // Extraer metadata del token de Clerk
  const metadata = (sessionClaims?.metadata as any) || {};
  let activeTenantId = metadata.tenantId;
  const roleFromMetadata = metadata.role || "USER";
  const userEmail = (sessionClaims as any)?.email || 
                    (sessionClaims as any)?.primary_email_address || 
                    (sessionClaims as any)?.email_address || "";
  
  // Variable para almacenar el rol actual (desde profiles o metadata)
  let actualRole = roleFromMetadata;

  const isPublic = isPublicRoute(req);
  const isAdmin = isAdminRoute(req);
  
  // Determinar si es super admin inicialmente
  let isSuperAdmin = roleFromMetadata === 'SUPER_ADMIN' || userEmail === 'sucachi.123@gmail.com';

  // 1. Si no es una ruta pública y el usuario no está logueado, Clerk redirige a login automáticamente
  if (!isPublic) {
    await auth.protect();
  }

  // 2. Lógica de Impersonación para Super Admin
  let impersonatedId: string | undefined;
  
  // La tabla users usa UUID para auth_id, pero Clerk usa strings como "user_xxx"
  // Por lo tanto, buscamos por email para Super Admin
  if (userId) {
    try {
      const currentUserEmail = userEmail.toLowerCase();
      const { data: userProfile } = await supabase
        .from('users')
        .select('role,email')
        .eq('email', currentUserEmail)
        .single();
      
      if (userProfile?.role === 'SUPER_ADMIN') {
        isSuperAdmin = true;
      }
    } catch (e) {}
  }
  
  if (isSuperAdmin) {
    impersonatedId = req.cookies.get('impersonated_tenant_id')?.value;
    if (impersonatedId) {
      activeTenantId = impersonatedId;
    }
  }

  // 3. Protección extra para rutas de administración - verificar rol desde users table
  if (isAdmin) {
    if (!userId) {
      console.log(`🚫 [Middleware Proxy] ACCESS DENIED: No user ID for ${pathname}`);
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
    
    try {
      // Buscar el rol del usuario actual por email
      const currentUserEmail = userEmail.toLowerCase();
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('role,email')
        .eq('email', currentUserEmail)
        .single();
      
      if (!userError && userProfile) {
        actualRole = userProfile.role;
        if (userProfile.role === 'SUPER_ADMIN') {
          isSuperAdmin = true;
        }
      }
    } catch (error) {
      console.error('Exception fetching user profile:', error);
    }
    
    const isAuthorized = isSuperAdmin || 
                        actualRole === 'SUPER_ADMIN' || 
                        actualRole === 'SUPPORT' ||
                        actualRole === 'ADMIN' ||
                        actualRole === 'MANAGER';
    
    if (!isAuthorized) {
      console.log(`🚫 [Middleware Proxy] ACCESS DENIED: User ${isProduction ? '[REDACTED]' : userEmail} tried to access ${pathname} without proper role. Actual role: ${actualRole}`);
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Diagnóstico detallado en consola del servidor
  console.log(`🛡️ [Middleware Proxy] ${req.method} ${pathname}`, {
    auth: {
      isAuthenticated: !!userId,
      userEmail: isProduction ? '[REDACTED]' : userEmail,
      roleFromMetadata,
      actualRole,
      isSuperAdmin
    },
    route: {
      isPublic,
      isAdmin
    },
    tenant: {
      originalId: metadata.tenantId || 'none',
      impersonatedId: impersonatedId || 'none',
      finalIdInyected: activeTenantId || 'none'
    }
  });

  // 4. Inyectar headers para Server Components y Supabase RLS
  const requestHeaders = new Headers(req.headers);
  if (activeTenantId) {
    requestHeaders.set('x-tenant-id', activeTenantId);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: [
    // Esta regex excluye archivos estáticos para optimizar el rendimiento
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};