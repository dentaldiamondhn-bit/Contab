"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { Shield, X } from "lucide-react";
import RoleBasedSidebar from "@/components/RoleBasedSidebar";
import { TenantHeader } from "@/components/dashboard/TenantHeader";
import { WorkspaceBar } from "@/components/workspace/WorkspaceBar";
import ErrorBoundary from "@/components/ErrorBoundary";

/**
 * Shell única de la aplicación autenticada.
 *
 * Antes `/dashboard` tenía su propio layout (TenantHeader + WorkspaceBar +
 * RoleBasedSidebar + main con padding) mientras que `/companies/[id]` se
 * renderizaba sin chrome desde `AppFrame`: mismo tema, pero estructura y CSS
 * distintos. Al compartir este componente ambas secciones quedan idénticas y
 * no pueden volver a divergir.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { isLoaded } = useUser();
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    setIsImpersonating(
      typeof document !== "undefined" &&
        document.cookie.includes("impersonated_tenant_id=")
    );
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando usuario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
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
              document.cookie = "impersonated_tenant_id=; path=/; max-age=0";
            }}
          >
            <X className="h-3.5 w-3.5" />
            Salir
          </a>
        </div>
      )}

      <TenantHeader tenants={[]} />

      {/* Empresa y sede activas, siempre a la vista. */}
      <WorkspaceBar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <RoleBasedSidebar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
