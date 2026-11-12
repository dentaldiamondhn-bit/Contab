"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { UnifiedSidebar } from "@/components/UnifiedSidebar";
import { WorkspaceBar } from "@/components/workspace/WorkspaceBar";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { useSidebar } from "@/app/contexts/SidebarContext";

/**
 * Rutas que se muestran a pantalla completa, sin el chrome de la app
 * (barra de empresa + sidebar). El login desplegado en app.contabhn.com
 * ocupa toda la ventana.
 */
const RUTAS_A_PANTALLA_COMPLETA = ["/auth", "/onboarding", "/payment", "/terms"];

/**
 * Secciones que ya traen su propio chrome en su `layout.tsx`
 * (TenantHeader + WorkspaceBar + RoleBasedSidebar, o su propio sidebar).
 * Envolverlas otra vez desde la raíz producía doble header y doble sidebar.
 */
const SECCIONES_CON_SHELL_PROPIO = [
  "/dashboard",
  "/admin",
  "/accountant",
  "/support",
  "/tenant-admin",
  "/companies",
];

function esPantallaCompleta(pathname: string): boolean {
  return RUTAS_A_PANTALLA_COMPLETA.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`)
  );
}

function tieneShellPropio(pathname: string): boolean {
  if (
    SECCIONES_CON_SHELL_PROPIO.some(
      (base) => pathname === base || pathname.startsWith(`${base}/`)
    )
  ) {
    return true;
  }
  // `/companies/[id]/security` y `/companies/[id]/tax-integration` tienen
  // layout propio de pantalla completa (sidebar de módulos / main a altura fija).
  // También se incluye /companies/[id] porque usa su propio layout con TenantHeader + RoleBasedSidebar.
  return /^\/companies\/[^/]+\/(security|tax-integration)(\/|$)/.test(pathname) ||
         /^\/companies\/[^/]+$/.test(pathname) ||
         /^\/companies\/[^/]+\//.test(pathname);
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const { collapsed, toggleCollapsed } = useSidebar();

  if (esPantallaCompleta(pathname)) {
    return <>{children}</>;
  }

  // El shell propio sigue dentro de WorkspaceShell para conservar el remontaje
  // por empresa al cambiar de empresa, pero sin añadir otro header/sidebar.
  if (tieneShellPropio(pathname)) {
    return <WorkspaceShell>{children}</WorkspaceShell>;
  }

  return (
    <WorkspaceShell>
      <div className="flex min-h-screen flex-col">
        <WorkspaceBar />
        <div className="flex flex-1">
          <UnifiedSidebar isCollapsed={collapsed} onToggleCollapse={toggleCollapsed} />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </WorkspaceShell>
  );
}
