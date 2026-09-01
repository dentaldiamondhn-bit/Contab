"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import RoleBasedSidebar from "@/components/RoleBasedSidebar";
import { TenantHeader } from "@/components/dashboard/TenantHeader";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Shield, X } from "lucide-react";

const IMPERSONATION_COOKIE = 'impersonated_tenant_id';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isLoading, isStaff } = useAuthSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const hasCookie = typeof document !== 'undefined' &&
      document.cookie.split('; ').some(c => c.startsWith(`${IMPERSONATION_COOKIE}=`));

    setIsImpersonating(hasCookie);

    // Si está impersonando, redirigir al dashboard de tenant
    if (hasCookie) {
      setIsRedirecting(true);
      router.replace('/dashboard');
    }
  }, [mounted, router]);

  useEffect(() => {
    if (isLoaded && mounted) {
      if (!isStaff) {
        const isImpersonatingCookie =
          typeof document !== 'undefined' &&
          document.cookie.includes(`${IMPERSONATION_COOKIE}=`);

        if (!isImpersonatingCookie) {
          console.warn('Access Denied: User is not staff. Redirecting...');
          setIsRedirecting(true);
          router.replace('/dashboard');
        }
      }
    }
  }, [isLoaded, mounted, router, isStaff]);

  if (isLoading || !mounted || isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-indigo-200 font-medium tracking-widest uppercase text-xs">Cargando Panel de Control...</p>
        </div>
      </div>
    );
  }

  if (!isStaff) return null;

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {isImpersonating && (
        <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium z-50 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Simulador de Admin — Estás viendo el sistema como un tenant</span>
          </div>
          <a
            href="/admin/panel"
            className="flex items-center gap-1 text-orange-100 hover:text-white text-xs"
            onClick={() => {
              document.cookie = `${IMPERSONATION_COOKIE}=; path=/; max-age=0`;
            }}
          >
            <X className="h-3.5 w-3.5" />
            Salir
          </a>
        </div>
      )}

      <TenantHeader tenants={[]} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <RoleBasedSidebar />

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