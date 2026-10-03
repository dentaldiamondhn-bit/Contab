import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";

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
  "/api/paypal/(.*)",
  "/api/webhooks(.*)",
  // "/api/accounting/uploaded-files(.*)" y "/api/accounting/excel-upload(.*)"
  // Ya NO son publicas: uploaded-files llegaba sin sesion y su DELETE borraba
  // Transaction/JournalEntry de cualquier empresa (ver CLAUDE.md, 28 Sept 2026).
  // Si el flujo de onboarding necesita subir antes de iniciar sesion, hay que
  // mover ese upload a una ruta con prefijo de usuario, no reabrir esta.
  "/",
]);

const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const { pathname } = req.nextUrl;

  const metadata = (sessionClaims?.metadata as any) || {};
  const roleFromMetadata = metadata.role || "USER";
  const userEmail = (sessionClaims as any)?.email || "";

  let isSuperAdmin = roleFromMetadata === 'SUPER_ADMIN' || userEmail === 'sucachi.123@gmail.com';

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  if (isAdminRoute(req) && !isPublicRoute(req)) {
    if (!userId) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
    const isAuthorized = isSuperAdmin || ['SUPER_ADMIN', 'SUPPORT', 'ADMIN', 'MANAGER'].includes(roleFromMetadata);
    if (!isAuthorized) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const hasImpersonationCookie = !!req.cookies.get('impersonated_tenant_id')?.value;
  if (isDashboardRoute && !isPublicRoute(req) && isSuperAdmin && !hasImpersonationCookie) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  // ===========================================
  // ÁREA 1: Hibridación de Acceso a Datos
  // ===========================================
  // 1. Pasar tenantId explícito en headers para queries Prisma
  // 2. Preparar cliente Supabase con JWT para RLS directo
  // ===========================================
  
  const requestHeaders = new Headers(req.headers);
  
  // Obtener usuario auth para pasar información de tenant
  const authUser = await getAuthUser(req as any);
  
  if (authUser?.tenantId) {
    // 1. Añadir tenantId explícito en header para Prisma queries
    requestHeaders.set('x-tenant-id', authUser.tenantId);
    
    // 2. Preparar Supabase client con JWT para RLS directo
    requestHeaders.set('x-user-jwt', authUser.userId || '');
  }

  // También pasar el tenantId desde metadata si no hay uno explícito
  if (metadata.tenantId && !requestHeaders.get('x-tenant-id')) {
    requestHeaders.set('x-tenant-id', metadata.tenantId);
  }

  // ===========================================
  // ÁREA 2: EMPRESA Y SEDE ACTIVAS (contexto de trabajo)
  // ===========================================
  // El selector de empresa y el de sede escriben estas cookies; aquí se
  // convierten en headers para que el servidor y las rutas de API los vean sin
  // leer cookies en cada handler.
  //
  // OJO CON EL MODELO DE CONFIANZA: la cookie es una PISTA, no una garantía.
  // Cualquiera puede editar sus cookies desde el navegador, así que el valor NO
  // se usa para autorizar: `contextoDeEspacio` (lib/workspace.ts) lo contrasta
  // contra `user_company_access` y devuelve 403 si la empresa no es del usuario.
  // Por eso el header se inyecta tal cual y la comprobación va después.
  //
  // `x-tenant-id` NO se toca aquí. Sigue saliendo de los claims de Clerk, que
  // son un solo tenant, y el contexto nuevo deriva el tenant de la empresa
  // activa. Reemplazarlo por el de la cookie rompería al contador que administra
  // empresas de varios tenants.
  const activeCompany = req.cookies.get('active_company_id')?.value;
  if (activeCompany) {
    requestHeaders.set('x-company-id', activeCompany);
  }

  const activeLocation = req.cookies.get('active_location_id')?.value;
  if (activeLocation) {
    requestHeaders.set('x-location-id', activeLocation);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
