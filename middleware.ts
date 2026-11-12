import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
  "/",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const { pathname } = req.nextUrl;

  const metadata = (sessionClaims?.metadata as Record<string, unknown>) || {};
  const roleFromMetadata = (metadata.role as string) || "USER";
  const userEmail = (sessionClaims as { email?: string } | null)?.email || "";

  const isSuperAdmin =
    roleFromMetadata === "SUPER_ADMIN" || userEmail === "sucachi.123@gmail.com";

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  if (isAdminRoute(req) && !isPublicRoute(req)) {
    if (!userId) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
    const isAuthorized =
      isSuperAdmin ||
      ["SUPER_ADMIN", "SUPPORT", "ADMIN", "MANAGER"].includes(roleFromMetadata);
    if (!isAuthorized) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  const isDashboardRoute =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const hasImpersonationCookie = !!req.cookies.get("impersonated_tenant_id")?.value;
  if (isDashboardRoute && !isPublicRoute(req) && isSuperAdmin && !hasImpersonationCookie) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  const requestHeaders = new Headers(req.headers);

  // Identidad de la sesion. Se resuelve con el `auth` que Clerk entrega al
  // middleware; llamar al `auth()` importado dentro de este callback no tiene
  // contexto y hacia que Clerk no detectara clerkMiddleware.
  if (userId) {
    requestHeaders.set("x-user-id", userId);
    requestHeaders.set("x-user-jwt", userId);
  }

  if (typeof metadata.tenantId === "string" && metadata.tenantId) {
    requestHeaders.set("x-tenant-id", metadata.tenantId);
  }

  // Empresa y sede activas: el selector escribe estas cookies y aqui se
  // convierten en headers. OJO: son una PISTA, no una autorizacion;
  // `contextoDeEspacio` (lib/workspace.ts) las valida contra
  // `user_company_access` y devuelve 403 si la empresa no es del usuario.
  const activeCompany = req.cookies.get("active_company_id")?.value;
  if (activeCompany) {
    requestHeaders.set("x-company-id", activeCompany);
  }

  const activeLocation = req.cookies.get("active_location_id")?.value;
  if (activeLocation) {
    requestHeaders.set("x-location-id", activeLocation);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
