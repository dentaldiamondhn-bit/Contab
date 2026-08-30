import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
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
  "/auth/register(.*)",
  "/auth/sign-in(.*)",
  "/auth/sign-up(.*)",
  "/auth/callback(.*)",
  "/auth/reset-password(.*)",
  "/api/auth/check-email(.*)",
  "/api/auth/check-username(.*)",
  "/api/admin/plans-public(.*)",
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

  // 2. Fetch actual role from DB for ALL authenticated users (not just admin routes)
  let impersonatedId: string | undefined;
  
  if (userId) {
    try {
      const currentUserEmail = userEmail.toLowerCase();
      const { data: userProfile } = await supabase
        .from('users')
        .select('role,email')
        .eq('email', currentUserEmail)
        .single();
      
      if (userProfile) {
        actualRole = userProfile.role;
        if (userProfile.role === 'SUPER_ADMIN') {
          isSuperAdmin = true;
        }
      } else {
        // DB lookup failed — try Clerk client as fallback
        try {
          const client = await clerkClient();
          const clerkUser = await client.users.getUser(userId);
          const clerkRole = (clerkUser.publicMetadata as any)?.role || (clerkUser.privateMetadata as any)?.role;
          if (clerkRole && clerkRole !== 'USER') {
            actualRole = clerkRole;
          }
        } catch {}
      }
    } catch (e) {}
  }
  
  if (isSuperAdmin) {
    impersonatedId = req.cookies.get('impersonated_tenant_id')?.value;
    if (impersonatedId) {
      activeTenantId = impersonatedId;
    }
  }

  // Compute effective role: DB role takes priority, fall back to Clerk metadata
  const effectiveRole = actualRole !== 'USER' ? actualRole : roleFromMetadata;

  // 3. Protección extra para rutas de administración (excepto planes públicos para onboarding)
  if (isAdmin && pathname !== '/api/admin/plans-public') {
    if (!userId) {
      console.log(`🚫 [Middleware Proxy] ACCESS DENIED: No user ID for ${pathname}`);
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
    
    const isAuthorized = isSuperAdmin || 
                        effectiveRole === 'SUPER_ADMIN' || 
                        effectiveRole === 'SUPPORT' ||
                        effectiveRole === 'ADMIN' ||
                        effectiveRole === 'MANAGER';
    
    if (!isAuthorized) {
      console.log(`🚫 [Middleware Proxy] ACCESS DENIED: User ${isProduction ? '[REDACTED]' : userEmail} tried to access ${pathname} without proper role. Actual role: ${actualRole}`);
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // 4. Redirect role-based users from /dashboard to their proper dashboards
  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  if (isDashboardRoute && !isPublic) {
    const impersonatedId = req.cookies.get('impersonated_tenant_id')?.value;
    // Only redirect if NOT impersonating (impersonation = super admin viewing as tenant user)
    if (!impersonatedId) {
      if (isSuperAdmin || effectiveRole === 'SUPER_ADMIN') {
        console.log(`🔄 [Middleware Proxy] Redirecting SUPER_ADMIN from ${pathname} to /admin/dashboard`);
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
      if (effectiveRole === 'SUPPORT') {
        console.log(`🔄 [Middleware Proxy] Redirecting SUPPORT from ${pathname} to /support`);
        return NextResponse.redirect(new URL("/support", req.url));
      }
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