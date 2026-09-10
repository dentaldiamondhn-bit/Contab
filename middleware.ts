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
  "/api/accounting/uploaded-files(.*)",
  "/api/accounting/excel-upload(.*)",
  "/api/accounting/trial-balance(.*)",
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

  if (isAdminRoute(req)) {
    if (!userId) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
    const isAuthorized = isSuperAdmin || ['SUPER_ADMIN', 'SUPPORT', 'ADMIN', 'MANAGER'].includes(roleFromMetadata);
    if (!isAuthorized) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  if (isDashboardRoute && !isPublicRoute(req)) {
    if (isSuperAdmin) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
  }

  const requestHeaders = new Headers(req.headers);
  if (metadata.tenantId) {
    requestHeaders.set('x-tenant-id', metadata.tenantId);
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
