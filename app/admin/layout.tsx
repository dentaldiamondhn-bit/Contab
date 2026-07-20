"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import RoleBasedSidebar from "@/components/RoleBasedSidebar";
import { TenantHeader } from "@/components/dashboard/TenantHeader";
import { useAuthSession } from "@/hooks/use-auth-session";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isLoading, isStaff } = useAuthSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoaded && mounted) {
      if (!isStaff) {
        // Kill the redirect loop: if we are already on /admin, do NOT bounce
        // back to /dashboard when the page hydrates and isStaff resolves as false
        // because the SUPER_ADMIN email fallback hasn't been picked up yet.
        const isImpersonatingCookie =
          typeof document !== 'undefined' &&
          document.cookie.includes('impersonated_tenant_id=');

        // Only bounce if we are NOT already in impersonation / system mode.
        if (!isImpersonatingCookie) {
          console.warn('Access Denied: User is not staff. Redirecting...');
          setIsRedirecting(true);
          router.replace('/dashboard');
        }
      }
    }
  }, [isLoaded, mounted, router, isStaff]);

  // Pantalla de carga profesional
  if (isLoading || !mounted || isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-indigo-200 font-medium tracking-widest uppercase text-xs">Cargando Panel de Control...</p>
        </div>
      </div>
    );
  }

  // Final security guard for rendering
  if (!isStaff) return null;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar en modo Sistema */}
      <RoleBasedSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header compartido que detectará automáticamente el Modo Sistema */}
        <TenantHeader tenants={[]} />

        {/* Contenido Administrativo */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>
            <div className="w-full">
              {children}
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}