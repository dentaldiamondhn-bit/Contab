"use client";

import { useUser } from "@clerk/nextjs";
import RoleBasedSidebar from "@/components/RoleBasedSidebar";
import { TenantHeader } from "@/components/dashboard/TenantHeader";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Shield, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded } = useUser();
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    setIsImpersonating(
      typeof document !== 'undefined' &&
      document.cookie.includes('impersonated_tenant_id=')
    );
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando usuario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <RoleBasedSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
                document.cookie = 'impersonated_tenant_id=; path=/; max-age=0';
              }}
            >
              <X className="h-3.5 w-3.5" />
              Salir
            </a>
          </div>
        )}

        <TenantHeader tenants={[]} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
