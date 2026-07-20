"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useTenant } from "@/lib/contexts/TenantContext";
import RoleBasedSidebar from "@/components/RoleBasedSidebar";
import { TenantHeader } from "@/components/dashboard/TenantHeader";

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { loading: tenantLoading, isSuperAdmin: isGlobalSuperAdmin } = useTenant();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const mountedRef = useRef(false);

  // Normalizar detección de rol al inicio del componente
  const rawRole = ((user?.publicMetadata?.role as string) || (user?.unsafeMetadata?.role as string) || "USER").toUpperCase();
  const email = user?.primaryEmailAddress?.emailAddress;
  const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  // isSystemPath: rutas "de sistema" que tienen su propio layout
  const isSystemPath = pathname.startsWith('/admin') || pathname.startsWith('/support');

  // Leer cookie DIRECTAMENTE en cada render (no en un cierre) para evitar el loop
  // de redirección de SUPER_ADMIN cuando TenantContext ya seteó la cookie de impersonación.
  const readIsImpersonating = () =>
    typeof document !== 'undefined' && document.cookie.includes('impersonated_tenant_id=');

  // EVITAR DOBLE SIDEBAR: Si estamos en una ruta de sistema y NO hay impersonación,
  // este layout no debe renderizar nada excepto delegar el contenido.
  if (mountedRef.current && isSystemPath && !readIsImpersonating()) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  useEffect(() => {
    if (user && mountedRef.current && !tenantLoading) {
      const isImpersonatingCookie = readIsImpersonating();

      console.log('UserDashboardLayout - User check:', { email, rawRole, isSuperAdminEmail, isImpersonatingCookie });

      // Redirect admin/support users to their respective dashboards while
      // honouring the impersonation cookie so the super-admin view is never
      // kicked out of the client dashboard mid-flow.
      if ((rawRole === 'SUPER_ADMIN' || isSuperAdminEmail) && !isImpersonatingCookie) {
        console.log('UserDashboardLayout - Redirecting SUPER_ADMIN to admin dashboard');
        setIsRedirecting(true);
        router.replace('/admin/dashboard');
      } else if (rawRole === 'SUPPORT' && !isImpersonatingCookie) {
        console.log('UserDashboardLayout - Redirecting SUPPORT to support dashboard');
        setIsRedirecting(true);
        router.replace('/support/dashboard');
      } else if ((rawRole === 'ADMIN' || rawRole === 'MANAGER' || rawRole === 'TENANT_ADMIN') && !isImpersonatingCookie) {
        console.log('UserDashboardLayout - Redirecting ADMIN/MANAGER/TENANT_ADMIN to tenant admin dashboard');
        setIsRedirecting(true);
        router.replace('/tenant-admin/dashboard');
      } else {
        console.log('UserDashboardLayout - ALLOWING ACCESS: Context validated');
        setIsRedirecting(false); // IMPORTANT: Unlock rendering
      }
    }
  }, [user, router, tenantLoading]);

  // Show loading while user is not loaded
  if (!isLoaded || !mountedRef.current || tenantLoading) {
    console.log('UserDashboardLayout - Showing loading, user not loaded yet');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando usuario...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('UserDashboardLayout - No user found after loading');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Usuario no encontrado...</p>
        </div>
      </div>
    );
  }

  // Verificación final para el bloqueo de renderizado
    const isAdminRole = rawRole === 'SUPER_ADMIN' || rawRole === 'ADMIN' || rawRole === 'MANAGER' || rawRole === 'TENANT_ADMIN';
    // Re-read the cookie at render-time so the guard uses fresh data
    const isImpersonatingNow = readIsImpersonating();
    const shouldBlock = (isAdminRole || isSuperAdminEmail || rawRole === 'SUPPORT') && !isImpersonatingNow;

    console.log('UserDashboardLayout - Access Decision:', {
      shouldBlock,
      isRedirecting,
      details: {
        userRole: rawRole,
        isSuperAdminByEmail: isSuperAdminEmail,
        isImpersonatingActive: isImpersonatingNow,
        hasAdminPrivileges: isAdminRole || isSuperAdminEmail || rawRole === 'SUPPORT'
      }
    });

  if (isRedirecting || shouldBlock) {
    return null; // Return null to allow redirect to complete
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Ahora incluido en el layout de dashboard */}
      <RoleBasedSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Usando el componente TenantHeader compartido */}
        <TenantHeader tenants={[]} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
